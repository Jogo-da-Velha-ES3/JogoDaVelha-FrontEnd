import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerState, RoomPhase, RoomSnapshot } from '../types/game'
import type { ClientCommand, ServerEnvelope } from '../types/events'
import { RenewingConnection } from './renewingConnection'
import type { ConnectionStatus, GameConnection, Unsubscribe } from './types'

const MINUTE = 60_000
const RENEW_AFTER = 50 * MINUTE
const FORCE_AFTER = 55 * MINUTE

/** Conexão falsa: o teste decide quando "conecta", quando entrega eventos e quando cai */
class FakeConnection implements GameConnection {
  roomCode: string | null = null
  failConnect = false
  autoSnapshot = true
  disconnected = false
  sent: ClientCommand[] = []
  resyncCalls = 0
  private readonly eventListeners = new Set<(event: ServerEnvelope) => void>()
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()

  connect(roomCode: string): Promise<void> {
    this.roomCode = roomCode
    return Promise.resolve().then(() => {
      if (this.failConnect) throw new Error('recusada')
      this.emitStatus('CONNECTING')
      this.emitStatus('CONNECTED')
      if (this.autoSnapshot) this.emit(snapshot('WAITING'))
    })
  }

  disconnect(): void {
    this.disconnected = true
    this.emitStatus('DISCONNECTED')
  }

  send(command: ClientCommand): void {
    this.sent.push(command)
  }

  /** O /sync do contrato V2: o teste decide se e quando responde com outro snapshot */
  resync(): void {
    this.resyncCalls += 1
  }

  onEvent(listener: (event: ServerEnvelope) => void): Unsubscribe {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onStatus(listener: (status: ConnectionStatus) => void): Unsubscribe {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  emit(event: ServerEnvelope) {
    this.eventListeners.forEach((listener) => listener(event))
  }

  emitStatus(status: ConnectionStatus) {
    this.statusListeners.forEach((listener) => listener(status))
  }
}

const VALID_PLAYER: PlayerState = {
  slot: 'P1',
  userId: 'user-1',
  nickname: 'eu',
  character: null,
  roundsWon: 0,
  consecutiveTimeouts: 0,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
}

const VALID_BOARD = Array.from({ length: 16 }, (_, index) => ({
  index,
  owner: null,
  effects: [],
}))

function snapshot(
  phase: RoomPhase,
  overrides: Partial<RoomSnapshot> = {},
  serverTime = Date.now(),
): ServerEnvelope {
  return {
    type: 'ROOM_SNAPSHOT',
    payload: {
      code: '4821',
      phase,
      players: [VALID_PLAYER],
      mySlot: 'P1',
      round: 1,
      suddenDeath: false,
      board: VALID_BOARD,
      turn: null,
      myDeck: [],
      outcome: null,
      serverTime,
      ...overrides,
    },
    serverTime,
  }
}

const phaseChange = (phase: RoomPhase, serverTime = Date.now()): ServerEnvelope => ({
  type: 'PHASE_CHANGE',
  payload: { phase },
  serverTime,
})

const matchEnd = (serverTime = Date.now()): ServerEnvelope => ({
  type: 'MATCH_END',
  payload: { outcome: { kind: 'ABSOLUTE_DRAW' }, coins: { P1: 0, P2: 0 } },
  serverTime,
})

function setup(configure?: (fake: FakeConnection, index: number) => void) {
  const created: FakeConnection[] = []
  const events: ServerEnvelope[] = []
  const statuses: ConnectionStatus[] = []
  const renewalErrors: unknown[] = []
  const connection = new RenewingConnection({
    createConnection: () => {
      const fake = new FakeConnection()
      configure?.(fake, created.length)
      created.push(fake)
      return fake
    },
    renewAfterMs: RENEW_AFTER,
    forceRenewAfterMs: FORCE_AFTER,
    snapshotTimeoutMs: 1_000,
    retryBaseMs: 1_000,
    retryMaxMs: 4_000,
    checkIntervalMs: 30_000,
    onRenewalError: (error) => renewalErrors.push(error),
  })
  connection.onEvent((event) => events.push(event))
  connection.onStatus((status) => statuses.push(status))
  return { connection, created, events, statuses, renewalErrors }
}

beforeEach(() => {
  vi.useFakeTimers()
  // Relógio em 0: os serverTime explícitos dos testes ficam comparáveis aos dos snapshots
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RenewingConnection', () => {
  it('conexão nova não renova antes dos 50 minutos', async () => {
    const { connection, created } = setup()
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER - 1_000)
    expect(created).toHaveLength(1)
    connection.disconnect()
  })

  it('aos 50 minutos a renovação fica pendente e começa no lobby', async () => {
    const { connection, created } = setup()
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    // Sem partida em andamento (fase nula = lobby): janela segura, a troca já começa
    expect(created).toHaveLength(2)
    expect(created[1].roomCode).toBe('4821')
    connection.disconnect()
  })

  it('durante a partida a renovação aguarda o MATCH_END', async () => {
    const { connection, created } = setup()
    await connection.connect('4821')
    created[0].emit(phaseChange('PLAYING'))
    await vi.advanceTimersByTimeAsync(RENEW_AFTER + MINUTE)
    expect(created).toHaveLength(1) // passou de 50 min, mas sem janela segura

    created[0].emit(matchEnd())
    await vi.advanceTimersByTimeAsync(0)
    expect(created).toHaveLength(2)
    connection.disconnect()
  })

  it('não renova só porque terminou um round', async () => {
    const { connection, created } = setup()
    await connection.connect('4821')
    created[0].emit(phaseChange('PLAYING'))
    created[0].emit({
      type: 'ROUND_END',
      payload: { round: 1, winner: 'P1', winningLine: null, score: { P1: 1, P2: 0 } },
      serverTime: Date.now(),
    })
    await vi.advanceTimersByTimeAsync(RENEW_AFTER + MINUTE)
    expect(created).toHaveLength(1)
    connection.disconnect()
  })

  it('a conexão antiga só é encerrada depois do ROOM_SNAPSHOT da nova', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created
    expect(newConn.roomCode).toBe('4821')

    // STOMP novo conectado e inscrito, mas sem snapshot: a antiga segue ativa e ouvida
    expect(oldConn.disconnected).toBe(false)
    oldConn.emit({
      type: 'TURN_START',
      payload: {
        player: 'P1',
        startedAt: 1_000,
        durationSeconds: 30,
        consecutiveTimeouts: { P1: 0, P2: 0 },
      },
      serverTime: 10,
    })
    expect(events.at(-1)?.type).toBe('TURN_START')

    newConn.emit(snapshot('PLAYING', {}, 20))
    await vi.advanceTimersByTimeAsync(0)
    expect(oldConn.disconnected).toBe(true)
    expect(events.at(-1)).toMatchObject({ type: 'ROOM_SNAPSHOT' })
    connection.disconnect()
  })

  it('na revanche a troca pendente acontece antes do novo Draft', async () => {
    const { connection, created } = setup((fake, index) => {
      if (index === 1) fake.failConnect = true // 1ª tentativa falha, volta com backoff
    })
    await connection.connect('4821')
    created[0].emit(phaseChange('PLAYING'))
    await vi.advanceTimersByTimeAsync(FORCE_AFTER) // forçada no meio da partida
    await vi.advanceTimersByTimeAsync(0)
    expect(created).toHaveLength(2)
    expect(created[0].disconnected).toBe(false)

    // O jogador aceita a revanche: MATCHED é janela segura, antes do DRAFT
    created[0].emit(matchEnd())
    created[0].emit(phaseChange('RESULT'))
    created[0].emit(phaseChange('MATCHED'))
    await vi.advanceTimersByTimeAsync(1_000) // backoff da tentativa falha
    expect(created).toHaveLength(3)
    connection.disconnect()
  })

  it('aos 55 minutos a troca começa mesmo com partida rolando', async () => {
    const { connection, created } = setup()
    await connection.connect('4821')
    created[0].emit(phaseChange('PLAYING'))
    await vi.advanceTimersByTimeAsync(FORCE_AFTER)
    expect(created).toHaveLength(2)
    connection.disconnect()
  })

  it('falha na conexão nova mantém a antiga e tenta de novo com backoff', async () => {
    const { connection, created, events, renewalErrors } = setup((fake, index) => {
      if (index === 1) fake.failConnect = true
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    await vi.advanceTimersByTimeAsync(0)

    expect(renewalErrors).toHaveLength(1)
    expect(created[0].disconnected).toBe(false) // a antiga segue de pé
    created[0].emit({ type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 5 })
    expect(events.at(-1)?.type).toBe('BOARD_UPDATE')

    // Backoff: a próxima tentativa cria a terceira conexão, que assume com o snapshot dela
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(created).toHaveLength(3)
    expect(created[0].disconnected).toBe(true)
    connection.disconnect()
  })

  it('sem ROOM_SNAPSHOT a tentativa expira e a antiga continua', async () => {
    const { connection, created, renewalErrors } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    await vi.advanceTimersByTimeAsync(0)
    expect(created).toHaveLength(2)
    expect(created[0].disconnected).toBe(false)

    // O handshake pediu um /sync logo após o /connect (resgate do snapshot)
    expect(created[1].resyncCalls).toBe(1)

    // Primeira janela sem snapshot: um /sync de resgate e nova espera
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(created[1].resyncCalls).toBe(2)
    expect(renewalErrors).toHaveLength(0)
    expect(created[0].disconnected).toBe(false)

    // Segunda janela também vazia: a tentativa é descartada, a antiga continua
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(renewalErrors).toHaveLength(1)
    expect(created[1].disconnected).toBe(true)
    expect(created[0].disconnected).toBe(false)

    // E a próxima tentativa (com snapshot) conclui a troca
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(created).toHaveLength(3)
    expect(created[0].disconnected).toBe(true)
    connection.disconnect()
  })

  it('pede /sync após o /connect e recupera o snapshot perdido', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false // o ROOM_SNAPSHOT do /connect se perde
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    await vi.advanceTimersByTimeAsync(0)
    const [oldConn, newConn] = created

    // /connect + /sync já foram enviados; o primeiro snapshot não chegou
    expect(newConn.resyncCalls).toBe(1)
    expect(oldConn.disconnected).toBe(false)

    // O /sync responde com o ROOM_SNAPSHOT privado: a conexão assume
    newConn.emit(snapshot('WAITING', {}, 60))
    await vi.advanceTimersByTimeAsync(0)
    expect(oldConn.disconnected).toBe(true)
    expect(events.at(-1)).toMatchObject({ type: 'ROOM_SNAPSHOT' })
    connection.disconnect()
  })

  it('o resgate do /sync também pode se perder: segunda janela vazia falha', async () => {
    const { connection, created, renewalErrors } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    await vi.advanceTimersByTimeAsync(0)
    const [, newConn] = created

    await vi.advanceTimersByTimeAsync(1_000) // 1ª janela: resync de resgate
    await vi.advanceTimersByTimeAsync(0)
    expect(newConn.resyncCalls).toBe(2)
    expect(renewalErrors).toHaveLength(0)

    // Nem o /sync respondeu: não há mais resgates, a tentativa falha com a antiga de pé
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(newConn.resyncCalls).toBe(2)
    expect(renewalErrors).toHaveLength(1)
    expect(newConn.disconnected).toBe(true)
    expect(created[0].disconnected).toBe(false)
    connection.disconnect()
  })

  it('eventos iguais nas duas conexões são processados uma vez só', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    const shared: ServerEnvelope = {
      type: 'BOARD_UPDATE',
      payload: { board: [] },
      serverTime: 42,
    }
    oldConn.emit(shared)
    newConn.emit(shared) // ignorado: só o snapshot importa antes da promoção
    newConn.emit(snapshot('WAITING', {}, 43)) // promove
    newConn.emit(shared) // a mesma mensagem de novo, agora pela conexão ativa: deduplica

    expect(events.filter((e) => e.type === 'BOARD_UPDATE')).toHaveLength(1)
    expect(events.at(-1)).toMatchObject({ type: 'ROOM_SNAPSHOT' }) // o repetido foi descartado
    connection.disconnect()
  })

  it('eventos da conexão nova anteriores ao snapshot são absorvidos por ele', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    // Chegam só na conexão nova durante a sincronização: o snapshot já os reflete no estado
    newConn.emit({
      type: 'DECK_UPDATE',
      payload: { deck: [] },
      serverTime: 77,
    })
    newConn.emit(snapshot('WAITING', {}, 78))

    expect(events.filter((e) => e.type === 'DECK_UPDATE')).toHaveLength(0)
    expect(events.at(-1)).toMatchObject({ type: 'ROOM_SNAPSHOT' })

    // Depois da promoção, a conexão nova entrega normalmente e a antiga é ignorada
    const after = { type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 79 } as ServerEnvelope
    newConn.emit(after)
    expect(events).toContainEqual(after)
    const late = { type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 80 } as ServerEnvelope
    oldConn.emit(late)
    expect(events).not.toContainEqual(late)
    connection.disconnect()
  })

  it('evento antigo da conexão nova não regride estado mais novo da antiga', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    // A antiga entrega um evento mais novo enquanto a nova ainda sincroniza
    oldConn.emit({
      type: 'TURN_START',
      payload: {
        player: 'P1',
        startedAt: 1_000,
        durationSeconds: 30,
        consecutiveTimeouts: { P1: 0, P2: 0 },
      },
      serverTime: 60,
    })
    // A nova recebeu antes um evento mais velho: não pode ser rejogado depois do snapshot
    newConn.emit({ type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 50 })
    newConn.emit(snapshot('PLAYING', {}, 70))

    const delivered = events.filter((e) => e.serverTime >= 50 && e.serverTime < 1_000_000)
    expect(delivered.map((e) => e.type)).toEqual(['TURN_START', 'ROOM_SNAPSHOT'])
    expect(events.some((e) => e.type === 'BOARD_UPDATE')).toBe(false)
    connection.disconnect()
  })

  it('reconexão automática zera o relógio da renovação', async () => {
    const { connection, created } = setup()
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(10 * MINUTE)
    // O stompjs reconectou: conexão nova de pé, o contador recomeça
    created[0].emitStatus('RECONNECTING')
    created[0].emitStatus('CONNECTED')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER - MINUTE)
    expect(created).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(MINUTE)
    expect(created).toHaveLength(2)
    connection.disconnect()
  })

  it('fase desconhecida não é janela segura: a renovação espera a confirmação', async () => {
    const { connection, created } = setup((fake, index) => {
      if (index === 0) fake.autoSnapshot = false // conecta sem snapshot: fase segue nula
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER + MINUTE)
    expect(created).toHaveLength(1)

    // O snapshot confirma WAITING: agora sim a troca pode começar
    created[0].emit(snapshot('WAITING', {}, 10))
    await vi.advanceTimersByTimeAsync(0)
    expect(created).toHaveLength(2)
    connection.disconnect()
  })

  it('falha na conexão inicial limpa timers, listeners e o cliente', async () => {
    const { connection, created } = setup((fake, index) => {
      if (index === 0) fake.failConnect = true
    })
    await expect(connection.connect('4821')).rejects.toThrow('recusada')
    expect(created[0].disconnected).toBe(true)

    // Sem monitoramento sobrevivendo: nada de novas conexões depois da falha
    await vi.advanceTimersByTimeAsync(2 * FORCE_AFTER)
    expect(created).toHaveLength(1)
    connection.disconnect()
  })

  it('snapshot de outra sala não promove a conexão nova', async () => {
    const { connection, created, renewalErrors } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    newConn.emit(snapshot('WAITING', { code: '9999' }, 30))
    await vi.advanceTimersByTimeAsync(0)
    expect(renewalErrors).toHaveLength(1)
    expect(newConn.disconnected).toBe(true)
    expect(oldConn.disconnected).toBe(false)

    // O backoff tenta de novo
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(created).toHaveLength(3)
    connection.disconnect()
  })

  it('snapshot sem os dados privados não promove a conexão nova', async () => {
    const { connection, created, renewalErrors } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    // ROOM_SNAPSHOT sem mySlot: o envelope.ts já filtraria, mas a validação é da renovação
    newConn.emit({
      type: 'ROOM_SNAPSHOT',
      payload: { code: '4821', phase: 'WAITING' },
      serverTime: 30,
    } as ServerEnvelope)
    await vi.advanceTimersByTimeAsync(0)
    expect(renewalErrors).toHaveLength(1)
    expect(newConn.disconnected).toBe(true)
    expect(oldConn.disconnected).toBe(false)
    connection.disconnect()
  })

  it.each(['DRAFT', 'VERSUS', 'ROUND_DRAW'] as const)(
    'não renova durante %s: espera o limite de segurança',
    async (phase) => {
      const { connection, created } = setup()
      await connection.connect('4821')
      created[0].emit(phaseChange(phase))
      await vi.advanceTimersByTimeAsync(RENEW_AFTER + MINUTE)
      expect(created).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(FORCE_AFTER - RENEW_AFTER - MINUTE)
      expect(created).toHaveLength(2)
      connection.disconnect()
    },
  )

  it('snapshot mais antigo que evento já aplicado não regride o estado', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    // A conexão antiga entrega um evento mais novo durante a sincronização
    oldConn.emit({
      type: 'TURN_START',
      payload: {
        player: 'P1',
        startedAt: 1_000,
        durationSeconds: 30,
        consecutiveTimeouts: { P1: 0, P2: 0 },
      },
      serverTime: 100,
    })
    // O snapshot da nova conexão é mais velho que esse evento
    newConn.emit(snapshot('WAITING', {}, 50))
    await vi.advanceTimersByTimeAsync(0)

    // A troca acontece (a conexão validou), mas o snapshot velho não é rejogado
    expect(oldConn.disconnected).toBe(true)
    expect(events.some((e) => e.type === 'ROOM_SNAPSHOT' && e.serverTime === 50)).toBe(false)
    expect(events.at(-1)).toMatchObject({ type: 'TURN_START', serverTime: 100 })
    connection.disconnect()
  })

  it('snapshot válido com todos os dados obrigatórios promove e é entregue', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [, newConn] = created

    const full = snapshot('RESULT', { outcome: { kind: 'ABSOLUTE_DRAW' } }, 500)
    newConn.emit(full)
    await vi.advanceTimersByTimeAsync(0)

    expect(created[0].disconnected).toBe(true)
    expect(events).toContainEqual(full)
    connection.disconnect()
  })

  it.each([
    ['board ausente', { board: undefined }],
    ['players que não é lista', { players: 'x' }],
    ['players vazia', { players: [] }],
    ['jogador sem slot válido', { players: [{ userId: 'u' }] }],
    ['board com tamanho errado', { board: [] }],
    ['casa do tabuleiro incompleta', { board: VALID_BOARD.map(() => ({ index: 0 })) }],
    ['myDeck ausente', { myDeck: undefined }],
    ['deck com habilidade fora do catálogo', { myDeck: [{ ability: 'X' }] }],
    ['serverTime do payload inválido', { serverTime: 'agora' }],
    ['phase desconhecida', { phase: 'INVALIDA' }],
    ['round ausente', { round: undefined }],
    ['suddenDeath com tipo errado', { suddenDeath: 'não' }],
    ['outcome com tipo errado', { outcome: 42 }],
    ['turn com tipo errado', { turn: 'x' }],
    ['turn sem os campos do turno', { turn: { player: 'P1' } }],
    ['outcome WIN sem o placar', { outcome: { kind: 'WIN', winner: 'P1' } }],
    ['mySlot ausente', { mySlot: null }],
  ])('snapshot inválido (%s) não promove e a antiga segue ativa', async (_name, patch) => {
    const { connection, created, renewalErrors } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    const valid = snapshot('WAITING', {}, 30)
    newConn.emit({
      ...valid,
      payload: { ...valid.payload, ...patch },
    } as ServerEnvelope)
    await vi.advanceTimersByTimeAsync(0)

    expect(renewalErrors).toHaveLength(1)
    expect(newConn.disconnected).toBe(true)
    expect(oldConn.disconnected).toBe(false)
    connection.disconnect()
  })

  it('não cria standby duplicada com checagens simultâneas', async () => {
    const { connection, created } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false // a standby fica pendente de propósito
    })
    await connection.connect('4821')
    created[0].emit(phaseChange('RESULT'))
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    expect(created).toHaveLength(2)

    // Eventos e acordares durante a sincronização não abrem outra tentativa
    for (let i = 0; i < 5; i++) {
      created[0].emit({ type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 1_000 + i })
      window.dispatchEvent(new Event('focus'))
    }
    // Menos que o snapshotTimeoutMs: a standby continua pendente durante as checagens
    await vi.advanceTimersByTimeAsync(500)
    expect(created).toHaveLength(2)
    connection.disconnect()
  })

  it('sala, estado da partida e intenções sobrevivem à renovação', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    created[0].emit(
      snapshot('RESULT', { outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] } }, 40),
    )
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    // Pedido de revanche e resposta seguem pela conexão antiga durante a troca
    oldConn.emit({
      type: 'REMATCH_REQUESTED',
      payload: { by: 'P2', deadline: 9_999 },
      serverTime: 41,
    })
    connection.send({ type: 'REMATCH_RESPOND', payload: { accept: true } })
    expect(oldConn.sent).toContainEqual({ type: 'REMATCH_RESPOND', payload: { accept: true } })
    expect(events.some((e) => e.type === 'REMATCH_REQUESTED')).toBe(true)

    newConn.emit(snapshot('DRAFT', {}, 42))
    await vi.advanceTimersByTimeAsync(0)
    connection.send({ type: 'DRAFT_CHARACTER', payload: { character: 'X' } })
    expect(newConn.sent).toContainEqual({ type: 'DRAFT_CHARACTER', payload: { character: 'X' } })
    connection.disconnect()
  })

  it('o status volta a CONNECTED depois da promoção, mesmo se a antiga caiu', async () => {
    const { connection, created, statuses } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    created[0].emitStatus('RECONNECTING') // a antiga caiu no meio da troca
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [, newConn] = created

    newConn.emit(snapshot('WAITING', {}, 20))
    await vi.advanceTimersByTimeAsync(0)

    expect(statuses.at(-1)).toBe('CONNECTED')
    expect(statuses).not.toContain('DISCONNECTED')
    connection.disconnect()
  })

  it('sair da sala cancela timers e desconecta as duas conexões', async () => {
    const { connection, created } = setup()
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    expect(created).toHaveLength(2)

    connection.disconnect()
    expect(created.every((c) => c.disconnected)).toBe(true)

    // Nenhuma tentativa extra depois de sair
    await vi.advanceTimersByTimeAsync(2 * FORCE_AFTER)
    expect(created).toHaveLength(2)
  })
})
