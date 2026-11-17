import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoomPhase, RoomSnapshot } from '../types/game'
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
      players: [],
      mySlot: 'P1',
      round: 1,
      suddenDeath: false,
      board: [],
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

    // O snapshot não chega: depois do tempo limite a tentativa é descartada
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
    newConn.emit(shared) // fica no buffer da conexão nova
    newConn.emit(snapshot('WAITING', {}, 43)) // promove e descarrega o buffer

    expect(events.filter((e) => e.type === 'BOARD_UPDATE')).toHaveLength(1)
    expect(events.at(-1)).toMatchObject({ type: 'ROOM_SNAPSHOT' })
    connection.disconnect()
  })

  it('evento que só a conexão nova recebeu não se perde, e a antiga é ignorada após a troca', async () => {
    const { connection, created, events } = setup((fake, index) => {
      if (index === 1) fake.autoSnapshot = false
    })
    await connection.connect('4821')
    await vi.advanceTimersByTimeAsync(RENEW_AFTER)
    const [oldConn, newConn] = created

    const privateEvent = {
      type: 'DECK_UPDATE',
      payload: { deck: [] },
      serverTime: 77,
    } as ServerEnvelope
    newConn.emit(privateEvent)
    newConn.emit(snapshot('WAITING', {}, 78))

    expect(events).toContainEqual(privateEvent)

    const late = { type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 79 } as ServerEnvelope
    oldConn.emit(late) // conexão antiga: nem ouvida depois da promoção
    expect(events).not.toContainEqual(late)
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
