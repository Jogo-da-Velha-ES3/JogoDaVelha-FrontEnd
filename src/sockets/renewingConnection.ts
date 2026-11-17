// Renovação preventiva da conexão STOMP: o Cloud Run limita a duração ABSOLUTA da requisição
// WebSocket (~60 min), mesmo com a conexão viva e heartbeats — não é timeout de inatividade, então
// a conexão é trocada antes disso — de preferência entre partidas, com limite de segurança no meio
// da partida. A troca é make-before-break: a conexão nova só assume depois de assinada e validada
// pelo ROOM_SNAPSHOT, e a antiga só é encerrada na promoção. A reconexão automática do
// StompConnection continua cuidando das quedas; isto aqui é outra coisa.
//
// Só envolve a conexão real (createGameConnection): o simulado e as conexões injetadas em testes
// não passam por aqui. Os nomes do back continuam escondidos em destinations.ts/envelope.ts.
import { ABILITIES } from '../constants/game'
import type { RoomPhase, RoomSnapshot } from '../types/game'
import type { ClientCommand, ServerEnvelope, ServerEvent } from '../types/events'
import type { ConnectionStatus, GameConnection, Unsubscribe } from './types'

const MINUTE = 60_000

export interface RenewingConnectionOptions {
  /** Cada renovação chama a fábrica de novo: outra conexão, outro Client STOMP */
  createConnection: () => GameConnection
  /** Idade em que a troca fica pendente e sai nas janelas seguras (padrão: 50 min) */
  renewAfterMs?: number
  /** Idade em que a troca começa mesmo no meio da partida (padrão: 55 min) */
  forceRenewAfterMs?: number
  /** Espera máxima por cada ROOM_SNAPSHOT da conexão nova (padrão: 10 s) */
  snapshotTimeoutMs?: number
  /** Backoff entre tentativas depois de uma renovação falha (padrão: 2 s, teto 30 s) */
  retryBaseMs?: number
  retryMaxMs?: number
  /** Rechecagem periódica do relógio, para abas em segundo plano (padrão: 30 s) */
  checkIntervalMs?: number
  /** Erros de renovação ficam registrados aqui, sem incomodar a tela */
  onRenewalError?: (error: unknown) => void
}

/**
 * Fases em que a sala está entre partidas: o WAITING é o lobby, o MATCHED é a contagem de 3s antes
 * da Preparação e o RESULT é o intervalo da revanche. Renovar aqui não atrapalha jogada, Draft,
 * sorteio nem rodada. MATCH_END também libera (ver matchEnded), cobrindo o intervalo até o
 * PHASE_CHANGE de RESULT. Fase desconhecida (null) NÃO é segura: sem confirmação do servidor de
 * que a sala está entre partidas, a renovação espera.
 */
const SAFE_PHASES: ReadonlySet<RoomPhase> = new Set(['WAITING', 'MATCHED', 'RESULT'])

/** Todas as fases conhecidas, para validar a estrutura do ROOM_SNAPSHOT */
const ROOM_PHASES: ReadonlySet<RoomPhase> = new Set([
  'WAITING',
  'MATCHED',
  'DRAFT',
  'VERSUS',
  'ROUND_DRAW',
  'PLAYING',
  'ROUND_END',
  'RESULT',
])

/** Teto do histórico de assinaturas de eventos, para deduplicar a sobreposição das duas conexões */
const SEEN_LIMIT = 500

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSlot = (value: unknown) => value === 'P1' || value === 'P2'

/** Os campos que as stores realmente leem de cada jogador do snapshot */
function validPlayers(players: unknown): boolean {
  return (
    Array.isArray(players) &&
    players.length > 0 &&
    players.every(
      (player) =>
        isRecord(player) &&
        isSlot(player.slot) &&
        typeof player.userId === 'string' &&
        typeof player.nickname === 'string',
    )
  )
}

/** Tabuleiro 4×4: cada casa tem índice, dono (ou vazio) e a lista de efeitos */
function validBoard(board: unknown): boolean {
  return (
    Array.isArray(board) &&
    board.length === 16 &&
    board.every(
      (cell) =>
        isRecord(cell) &&
        typeof cell.index === 'number' &&
        (cell.owner === null || isSlot(cell.owner)) &&
        Array.isArray(cell.effects),
    )
  )
}

/** Meu deck: habilidade do catálogo, origem e se já foi usada no round */
function validDeck(deck: unknown): boolean {
  const abilities: readonly string[] = ABILITIES
  return (
    Array.isArray(deck) &&
    deck.every(
      (slot) =>
        isRecord(slot) &&
        typeof slot.ability === 'string' &&
        abilities.includes(slot.ability) &&
        (slot.source === 'INITIAL' || slot.source === 'DRAWN') &&
        typeof slot.usedThisRound === 'boolean',
    )
  )
}

function validTurn(turn: unknown): boolean {
  return (
    turn === null ||
    (isRecord(turn) &&
      isSlot(turn.player) &&
      typeof turn.startedAt === 'number' &&
      typeof turn.durationSeconds === 'number')
  )
}

function validOutcome(outcome: unknown): boolean {
  if (outcome === null) return true
  if (!isRecord(outcome)) return false
  if (outcome.kind === 'ABSOLUTE_DRAW') return true
  if (outcome.kind !== 'WIN' && outcome.kind !== 'WO') return false
  if (!isSlot(outcome.winner)) return false
  return (
    outcome.kind === 'WO' ||
    (Array.isArray(outcome.score) &&
      outcome.score.length === 2 &&
      outcome.score.every((points) => typeof points === 'number'))
  )
}

export class RenewingConnection implements GameConnection {
  private readonly options: RenewingConnectionOptions
  private active: GameConnection | null = null
  private activeUnsubs: Unsubscribe[] = []
  private standby: GameConnection | null = null
  private standbyUnsubs: Unsubscribe[] = []
  private standbyConnectedAt = 0
  /** Quantos /sync de resgate já foram pedidos nesta tentativa (além do /connect) */
  private standbyResyncs = 0
  private roomCode: string | null = null
  /** Instante em que a conexão ativa foi estabelecida; null = ainda não conectou */
  private connectedAt: number | null = null
  private phase: RoomPhase | null = null
  private matchEnded = false
  /** Maior serverTime já entregue pelas telas: um snapshot mais velho não pode regredir o estado */
  private newestServerTime = 0
  private renewing = false
  private failures = 0
  private readonly eventListeners = new Set<(event: ServerEnvelope) => void>()
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()
  /** Assinaturas já entregues às telas: a mesma mensagem nas duas conexões vira uma só */
  private seen = new Set<string>()
  private seenOrder: string[] = []
  private checkTimer: ReturnType<typeof setTimeout> | null = null
  private monitorTimer: ReturnType<typeof setInterval> | null = null
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = false
  private readonly onWake = () => {
    this.scheduleNextCheck()
    this.checkRenewal()
  }

  constructor(options: RenewingConnectionOptions) {
    this.options = options
  }

  private get renewAfterMs() {
    return this.options.renewAfterMs ?? 50 * MINUTE
  }

  private get forceRenewAfterMs() {
    return this.options.forceRenewAfterMs ?? 55 * MINUTE
  }

  private now() {
    return Date.now()
  }

  async connect(roomCode: string): Promise<void> {
    this.roomCode = roomCode
    this.disposed = false
    this.seen = new Set()
    this.seenOrder = []
    this.newestServerTime = 0
    this.connectedAt = null
    const connection = this.options.createConnection()
    this.active = connection
    this.activeUnsubs = this.wireActive(connection)
    this.startMonitoring()
    try {
      await connection.connect(roomCode)
    } catch (error) {
      // Sem conexão não há o que renovar: desfaz listeners, timers e o cliente para não vazar
      // (joinRoom pode retornar sem leaveRoom quando a sessão é inválida)
      this.activeUnsubs.forEach((unsubscribe) => unsubscribe())
      this.activeUnsubs = []
      this.active = null
      this.clearTimers()
      this.removeWakeListeners()
      this.disposed = true
      connection.disconnect()
      throw error
    }
  }

  disconnect(): void {
    this.disposed = true
    this.clearTimers()
    this.removeWakeListeners()
    const connections = [this.active, this.standby]
    this.activeUnsubs.forEach((unsubscribe) => unsubscribe())
    this.standbyUnsubs.forEach((unsubscribe) => unsubscribe())
    this.activeUnsubs = []
    this.standbyUnsubs = []
    this.active = null
    this.standby = null
    connections.forEach((connection) => connection?.disconnect())
    this.setStatus('DISCONNECTED')
  }

  send(command: ClientCommand): void {
    // Enquanto a troca está pendente, as intenções seguem pela conexão antiga, que continua viva
    this.active?.send(command)
  }

  onEvent(listener: (event: ServerEnvelope) => void): Unsubscribe {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onStatus(listener: (status: ConnectionStatus) => void): Unsubscribe {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  // --- eventos e status ---

  /** Liga os eventos da conexão ativa: deduplica, atualiza a fase e dispara a checagem */
  private wireActive(connection: GameConnection): Unsubscribe[] {
    return [
      connection.onEvent((event) => {
        // Snapshot mais velho que o evento mais novo já aplicado não pode regredir o estado
        if (this.isStaleSnapshot(event)) return
        this.trackPhase(event)
        if (this.accept(event)) {
          this.noteServerTime(event)
          this.emitEvent(event)
          this.checkRenewal()
        }
      }),
      connection.onStatus((status) => {
        // Toda conexão estabelecida zera o relógio: a inicial e cada reconexão automática do
        // stompjs contam como conexão nova
        if (status === 'CONNECTED') {
          this.connectedAt = this.now()
          this.failures = 0
          this.scheduleNextCheck()
        }
        this.statusListeners.forEach((listener) => listener(status))
      }),
    ]
  }

  /**
   * Da conexão nova só importa o ROOM_SNAPSHOT: ele é a prova de que os tópicos foram assinados e
   * traz o estado completo do servidor, então absorve tudo que chegou antes dele. Rejogar eventos
   * mais antigos que o snapshot depois da promoção poderia regredir o estado — eles são ignorados.
   */
  private wireStandby(connection: GameConnection): Unsubscribe[] {
    return [
      connection.onEvent((event) => {
        if (event.type !== 'ROOM_SNAPSHOT') return
        if (this.isRoomSnapshot(event)) this.promoteStandby(event)
        else this.failRenewal(new Error('ROOM_SNAPSHOT inválido na renovação'))
      }),
      connection.onStatus((status) => {
        if (status === 'CONNECTED') this.standbyConnectedAt = this.now()
      }),
    ]
  }

  /** Eventos locais (ex: NOT_CONNECTED) usam o relógio do navegador, não o do servidor */
  private noteServerTime(event: ServerEnvelope) {
    if (!event.local) this.newestServerTime = Math.max(this.newestServerTime, event.serverTime)
  }

  /**
   * Um ROOM_SNAPSHOT carrega o estado inteiro do servidor no instante do serverTime dele: se já
   * entregamos um evento mais novo, rejogá-lo regrediria fase, turno e tabuleiro
   */
  private isStaleSnapshot(event: ServerEnvelope): boolean {
    if (event.type !== 'ROOM_SNAPSHOT' || event.local) return false
    const serverTime = (event.payload as RoomSnapshot).serverTime
    return typeof serverTime === 'number' && serverTime < this.newestServerTime
  }

  /**
   * O snapshot tem que ser desta sala e trazer a estrutura que as stores consomem: fase válida,
   * rodada e morte súbita, jogadores, tabuleiro 4×4, meu deck, turno, resultado e o relógio do
   * servidor — tudo no formato interno, não só "é um objeto"
   */
  private isRoomSnapshot(event: ServerEnvelope): boolean {
    const payload = event.payload as Partial<RoomSnapshot>
    return (
      payload.code === this.roomCode &&
      (payload.mySlot === 'P1' || payload.mySlot === 'P2') &&
      typeof payload.phase === 'string' &&
      ROOM_PHASES.has(payload.phase as RoomPhase) &&
      typeof payload.round === 'number' &&
      typeof payload.suddenDeath === 'boolean' &&
      validPlayers(payload.players) &&
      validBoard(payload.board) &&
      validDeck(payload.myDeck) &&
      validTurn(payload.turn) &&
      validOutcome(payload.outcome) &&
      typeof payload.serverTime === 'number'
    )
  }

  /** ROOM_SNAPSHOT substitui o estado; MATCH_END e PHASE_CHANGE dizem se há partida rolando */
  private trackPhase(envelope: ServerEnvelope) {
    const event = { type: envelope.type, payload: envelope.payload } as ServerEvent
    if (event.type === 'ROOM_SNAPSHOT') {
      this.phase = event.payload.phase
      this.matchEnded = event.payload.outcome !== null
      return
    }
    if (event.type === 'PHASE_CHANGE') {
      this.phase = event.payload.phase
      // Uma fase nova de preparação/partida encerra a janela do MATCH_END anterior
      this.matchEnded = event.payload.phase === 'RESULT'
      return
    }
    if (event.type === 'MATCH_END') this.matchEnded = true
  }

  private isSafeWindow() {
    return (this.phase !== null && SAFE_PHASES.has(this.phase)) || this.matchEnded
  }

  // --- deduplicação ---

  /** Mesma mensagem entregue pelas duas conexões tem o mesmo type, serverTime e payload */
  private signature(event: ServerEnvelope) {
    return `${event.type}|${event.serverTime}|${JSON.stringify(event.payload)}`
  }

  private accept(event: ServerEnvelope): boolean {
    // Erros locais (ex: NOT_CONNECTED) nascem na própria conexão: não têm par no servidor
    if (event.local) return true
    const signature = this.signature(event)
    if (this.seen.has(signature)) return false
    this.seen.add(signature)
    this.seenOrder.push(signature)
    if (this.seenOrder.length > SEEN_LIMIT) {
      const oldest = this.seenOrder.shift()
      if (oldest !== undefined) this.seen.delete(oldest)
    }
    return true
  }

  private emitEvent(event: ServerEnvelope) {
    this.eventListeners.forEach((listener) => listener(event))
  }

  private setStatus(status: ConnectionStatus) {
    this.statusListeners.forEach((listener) => listener(status))
  }

  // --- relógio e agendamento ---

  private startMonitoring() {
    if (this.monitorTimer !== null) return
    const interval = this.options.checkIntervalMs ?? 30_000
    this.monitorTimer = setInterval(() => this.checkRenewal(), interval)
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', this.onWake)
      window.addEventListener('focus', this.onWake)
      window.addEventListener('pageshow', this.onWake)
    }
    this.scheduleNextCheck()
  }

  private removeWakeListeners() {
    if (typeof window === 'undefined') return
    window.removeEventListener('visibilitychange', this.onWake)
    window.removeEventListener('focus', this.onWake)
    window.removeEventListener('pageshow', this.onWake)
  }

  private clearTimers() {
    if (this.checkTimer !== null) clearTimeout(this.checkTimer)
    if (this.monitorTimer !== null) clearInterval(this.monitorTimer)
    if (this.snapshotTimer !== null) clearTimeout(this.snapshotTimer)
    if (this.retryTimer !== null) clearTimeout(this.retryTimer)
    this.checkTimer = null
    this.monitorTimer = null
    this.snapshotTimer = null
    this.retryTimer = null
  }

  /** Desperta no próximo limite (50 ou 55 min); o intervalo cobre relógio atrasado */
  private scheduleNextCheck() {
    const connectedAt = this.connectedAt
    if (
      this.disposed ||
      this.checkTimer !== null ||
      connectedAt === null ||
      this.renewing ||
      this.standby ||
      this.retryTimer !== null
    )
      return
    const elapsed = this.now() - connectedAt
    const target = elapsed >= this.renewAfterMs ? this.forceRenewAfterMs : this.renewAfterMs
    const delay = Math.max(0, connectedAt + target - this.now())
    this.checkTimer = setTimeout(() => {
      this.checkTimer = null
      this.checkRenewal()
    }, delay)
  }

  private checkRenewal() {
    // Com tentativa em andamento ou backoff armado, quem retoma a checagem é o próprio fluxo
    // dela (promoção, falha ou o timer de retry) — remarcar aqui criaria timers em loop
    if (this.disposed || this.renewing || this.standby || this.retryTimer !== null) return
    const elapsed = this.connectedAt === null ? 0 : this.now() - this.connectedAt
    if (elapsed < this.renewAfterMs) {
      this.scheduleNextCheck()
      return
    }
    // A partir do limite de segurança a troca começa mesmo com partida rolando
    if (elapsed < this.forceRenewAfterMs && !this.isSafeWindow()) {
      this.scheduleNextCheck()
      return
    }
    this.startRenewal()
  }

  // --- a troca make-before-break ---

  private startRenewal() {
    if (this.renewing || this.standby || !this.roomCode || !this.active) return
    this.renewing = true
    this.standbyResyncs = 0
    const standby = this.options.createConnection()
    this.standby = standby
    this.standbyConnectedAt = 0
    this.standbyUnsubs = this.wireStandby(standby)
    void standby
      .connect(this.roomCode)
      .then(() => {
        if (this.standby !== standby) return
        // Handshake da renovação (contrato V2): o /connect já foi publicado; o /sync pede um
        // segundo ROOM_SNAPSHOT privado, cobrindo o caso de o primeiro se perder no caminho
        standby.resync?.()
        this.armSnapshotTimer(standby)
      })
      .catch((error: unknown) => this.failRenewal(error))
  }

  /**
   * Espera o ROOM_SNAPSHOT privado da conexão nova. Se o prazo estourar, pede um /sync de resgate
   * (uma vez por tentativa) e arma de novo; sem resposta na segunda janela, a tentativa falha e a
   * conexão antiga segue intacta
   */
  private armSnapshotTimer(standby: GameConnection) {
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null
      if (this.standby !== standby) return
      if (standby.resync && this.standbyResyncs === 0) {
        this.standbyResyncs += 1
        standby.resync()
        this.armSnapshotTimer(standby)
        return
      }
      this.failRenewal(new Error('ROOM_SNAPSHOT não chegou na renovação'))
    }, this.options.snapshotTimeoutMs ?? 10_000)
  }

  /**
   * A conexão nova validou: vira a ativa e o snapshot dela é reprocessado pela deduplicação —
   * ele já carrega o estado completo, então nada anterior precisa ser rejogado. A antiga é
   * desligada por último, só depois de tudo confirmado.
   */
  private promoteStandby(snapshot: ServerEnvelope) {
    const next = this.standby
    if (!next) return
    this.standby = null
    this.standbyUnsubs.forEach((unsubscribe) => unsubscribe())
    this.standbyUnsubs = []
    if (this.snapshotTimer !== null) clearTimeout(this.snapshotTimer)
    this.snapshotTimer = null

    const previous = this.active
    const previousUnsubs = this.activeUnsubs
    this.active = next
    this.activeUnsubs = this.wireActive(next)
    this.connectedAt = this.standbyConnectedAt || this.now()
    this.renewing = false
    this.failures = 0

    // Um evento mais novo que o snapshot já foi aplicado pela conexão antiga: rejogar o
    // snapshot regrediria o estado, então ele é descartado (a conexão assume mesmo assim)
    const snapshotTime = (snapshot.payload as RoomSnapshot).serverTime
    if (typeof snapshotTime === 'number' && snapshotTime >= this.newestServerTime) {
      this.trackPhase(snapshot)
      if (this.accept(snapshot)) {
        this.noteServerTime(snapshot)
        this.emitEvent(snapshot)
      }
    }

    // A antiga para de ser ouvida antes de desligar: nada dela passa depois da promoção
    previousUnsubs.forEach((unsubscribe) => unsubscribe())
    previous?.disconnect()
    // O CONNECTED da conexão nova ficou só na escuta interna: sem este aviso a tela podia ficar
    // presa em RECONNECTING/DISCONNECTED se a antiga tivesse caído durante a troca
    this.setStatus('CONNECTED')
    this.scheduleNextCheck()
  }

  /** A conexão nova falhou: a antiga segue intacta e a tentativa volta com backoff */
  private failRenewal(error: unknown) {
    const standby = this.standby
    if (!standby) return
    this.options.onRenewalError?.(error)
    this.standby = null
    this.standbyUnsubs.forEach((unsubscribe) => unsubscribe())
    this.standbyUnsubs = []
    if (this.snapshotTimer !== null) clearTimeout(this.snapshotTimer)
    this.snapshotTimer = null
    this.renewing = false
    standby.disconnect()

    if (this.disposed || this.retryTimer !== null) return
    const base = this.options.retryBaseMs ?? 2_000
    const max = this.options.retryMaxMs ?? 30_000
    const delay = Math.min(base * 2 ** this.failures, max)
    this.failures += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.checkRenewal()
    }, delay)
    this.scheduleNextCheck()
  }
}
