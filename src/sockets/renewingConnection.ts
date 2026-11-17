// Renovação preventiva da conexão STOMP: o Cloud Run encerra WebSocket ocioso por volta de 60
// minutos, então a conexão é trocada antes disso — de preferência entre partidas, com limite de
// segurança no meio da partida. A troca é make-before-break: a conexão nova só assume depois de
// assinada e validada pelo ROOM_SNAPSHOT, e a antiga só é encerrada na promoção. A reconexão
// automática do StompConnection continua cuidando das quedas; isto aqui é outra coisa.
//
// Só envolve a conexão real (createGameConnection): o simulado e as conexões injetadas em testes
// não passam por aqui. Os nomes do back continuam escondidos em destinations.ts/envelope.ts.
import type { RoomPhase } from '../types/game'
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
  /** Espera máxima pelo ROOM_SNAPSHOT da conexão nova (padrão: 10 s) */
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
 * PHASE_CHANGE de RESULT.
 */
const SAFE_PHASES: ReadonlySet<RoomPhase | null> = new Set(['WAITING', 'MATCHED', 'RESULT', null])

/** Teto do histórico de assinaturas de eventos, para deduplicar a sobreposição das duas conexões */
const SEEN_LIMIT = 500

export class RenewingConnection implements GameConnection {
  private readonly options: RenewingConnectionOptions
  private active: GameConnection | null = null
  private activeUnsubs: Unsubscribe[] = []
  private standby: GameConnection | null = null
  private standbyUnsubs: Unsubscribe[] = []
  /** Eventos da conexão nova antes da promoção: entram depois do snapshot, sem se perder */
  private standbyBuffer: ServerEnvelope[] = []
  private standbyConnectedAt = 0
  private roomCode: string | null = null
  /** Instante em que a conexão ativa foi estabelecida; 0 = ainda não conectou */
  private connectedAt = 0
  private phase: RoomPhase | null = null
  private matchEnded = false
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
    const connection = this.options.createConnection()
    this.active = connection
    this.activeUnsubs = this.wireActive(connection)
    this.startMonitoring()
    await connection.connect(roomCode)
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
    this.standbyBuffer = []
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
        this.trackPhase(event)
        if (this.accept(event)) {
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

  /** A conexão nova é ouvida à parte: os eventos ficam em buffer até a promoção */
  private wireStandby(connection: GameConnection): Unsubscribe[] {
    return [
      connection.onEvent((event) => {
        this.standbyBuffer.push(event)
        // O snapshot privado só chega depois do /connect: é a prova de que a conexão nova
        // assinou os tópicos e está sincronizada — pode assumir
        if (event.type === 'ROOM_SNAPSHOT') this.promoteStandby()
      }),
      connection.onStatus((status) => {
        if (status === 'CONNECTED') this.standbyConnectedAt = this.now()
      }),
    ]
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
    return SAFE_PHASES.has(this.phase) || this.matchEnded
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
    if (
      this.disposed ||
      this.checkTimer !== null ||
      this.connectedAt === 0 ||
      this.renewing ||
      this.standby ||
      this.retryTimer !== null
    )
      return
    const elapsed = this.now() - this.connectedAt
    const target = elapsed >= this.renewAfterMs ? this.forceRenewAfterMs : this.renewAfterMs
    const delay = Math.max(0, this.connectedAt + target - this.now())
    this.checkTimer = setTimeout(() => {
      this.checkTimer = null
      this.checkRenewal()
    }, delay)
  }

  private checkRenewal() {
    // Com tentativa em andamento ou backoff armado, quem retoma a checagem é o próprio fluxo
    // dela (promoção, falha ou o timer de retry) — remarcar aqui criaria timers em loop
    if (this.disposed || this.renewing || this.standby || this.retryTimer !== null) return
    const elapsed = this.connectedAt === 0 ? 0 : this.now() - this.connectedAt
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
    const standby = this.options.createConnection()
    this.standby = standby
    this.standbyBuffer = []
    this.standbyConnectedAt = 0
    this.standbyUnsubs = this.wireStandby(standby)
    void standby
      .connect(this.roomCode)
      .then(() => {
        // O STOMP conectou e o /connect já foi publicado; agora é esperar o snapshot
        if (this.standby !== standby) return
        this.snapshotTimer = setTimeout(
          () => this.failRenewal(new Error('ROOM_SNAPSHOT não chegou na renovação')),
          this.options.snapshotTimeoutMs ?? 10_000,
        )
      })
      .catch((error: unknown) => this.failRenewal(error))
  }

  /**
   * A conexão nova validou: vira a ativa, o buffer dela é reprocessado pela deduplicação e a
   * antiga é desligada por último — só depois de tudo confirmado.
   */
  private promoteStandby() {
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

    // O buffer pode repetir o que a conexão antiga já entregou: a deduplicação resolve
    const buffered = this.standbyBuffer
    this.standbyBuffer = []
    for (const event of buffered) {
      this.trackPhase(event)
      if (this.accept(event)) this.emitEvent(event)
    }

    // A antiga para de ser ouvida antes de desligar: nada dela passa depois da promoção
    previousUnsubs.forEach((unsubscribe) => unsubscribe())
    previous?.disconnect()
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
    this.standbyBuffer = []
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
