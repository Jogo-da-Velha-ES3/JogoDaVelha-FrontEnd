import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMatchStore } from '../stores/matchStore'
import { useRoomStore } from '../stores/roomStore'
import { resetGameStores } from '../stores/serverEvents'
import { useTimerStore } from '../stores/timerStore'
import {
  createGameConnection,
  isMockServerEnabled,
  joinRoom,
  leaveRoom,
  sendCommand,
} from './gameClient'
import { StompConnection } from './stompConnection'
import { MockConnection } from './mock/mockConnection'
import { MOCK_TIMINGS } from './mock/mockServer'
import { SCENARIOS } from './mock/scenarios'
import type { GameConnection } from './types'

const LATENCY = 50

beforeEach(() => {
  vi.useFakeTimers()
  resetGameStores()
})

afterEach(() => {
  leaveRoom()
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

async function join(scenario = SCENARIOS.vitoria) {
  const connection = new MockConnection({ scenario, latencyMs: LATENCY, random: () => 0.3 })
  const joined = joinRoom('4821', { connection })
  await vi.advanceTimersByTimeAsync(LATENCY * 2)
  await joined
  return connection
}

describe('gameClient + servidor simulado', () => {
  it('o simulado fica ligado por padrão até a FE-18', () => {
    expect(isMockServerEnabled()).toBe(true)
  })

  it('entrar na sala liga os eventos às stores e o status da conexão', async () => {
    await join()
    expect(useRoomStore.getState()).toMatchObject({
      code: '4821',
      phase: 'WAITING',
      mySlot: 'P1',
      connection: 'CONNECTED',
    })
    await vi.advanceTimersByTimeAsync(MOCK_TIMINGS.botJoin + LATENCY)
    expect(useRoomStore.getState().players).toHaveLength(2)
    expect(useRoomStore.getState().phase).toBe('MATCHED')
  })

  it('intenções vão pelo sendCommand e o estado só muda com a resposta', async () => {
    await join()
    await vi.advanceTimersByTimeAsync(MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched + LATENCY)
    expect(useRoomStore.getState().phase).toBe('DRAFT')

    sendCommand({ type: 'DRAFT_CHARACTER', payload: { character: 'CORACAO' } })
    expect(useRoomStore.getState().players[0].character).toBeNull() // ainda sem resposta
    await vi.advanceTimersByTimeAsync(LATENCY * 2)
    expect(useRoomStore.getState().players[0].character).toBe('CORACAO')
  })

  it('cenário "vitoria" chega ao Resultado com placar e Coins nas stores', async () => {
    await join(SCENARIOS.vitoria)
    sendCommand({ type: 'DRAFT_CHARACTER', payload: { character: 'X' } })
    sendCommand({ type: 'DRAFT_ABILITIES', payload: { abilities: ['BOMBA', 'ESCUDO'] } })
    await vi.advanceTimersByTimeAsync(60_000)

    expect(useRoomStore.getState().phase).toBe('RESULT')
    expect(useMatchStore.getState()).toMatchObject({
      score: { P1: 2, P2: 0 },
      outcome: { kind: 'WIN', winner: 'P1' },
      coins: { P1: 50, P2: 10 },
    })
    expect(useTimerStore.getState().turn).toBeNull()
  })

  it('sair desconecta e limpa a partida', async () => {
    await join()
    leaveRoom()
    expect(useRoomStore.getState()).toMatchObject({ code: null, players: [], connection: 'IDLE' })
  })

  it('sair enquanto a conexão ainda carrega não deixa conexão pendurada (StrictMode)', async () => {
    const pending = joinRoom('4821', { mock: { scenario: SCENARIOS.normal, latencyMs: LATENCY } })
    leaveRoom()
    await pending
    await vi.advanceTimersByTimeAsync(5000)
    expect(useRoomStore.getState().code).toBeNull()
  })
})

describe('entrar na sala com o back recusando a conexão', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  /** Conexão que o back recusa no CONNECT, como o StompConnection com o token vencido */
  const refused = (): GameConnection => ({
    connect: () => Promise.reject(new Error('O servidor recusou a conexão.')),
    disconnect: () => {},
    send: () => {},
    onEvent: () => () => {},
    onStatus: () => () => {},
  })

  it('token vencido: o REST confirma o 401 e a entrada acaba sem erro de sala', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
    )

    await expect(joinRoom('4821', { connection: refused() })).resolves.toBeUndefined()
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/coins\/balance$/)
  })

  it('com a sessão valendo, a recusa chega à tela como erro', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ coinsBalance: 0 })))

    await expect(joinRoom('4821', { connection: refused() })).rejects.toThrow(
      'O servidor recusou a conexão.',
    )
  })
})

describe('createGameConnection', () => {
  it('sem VITE_USE_MOCK_SERVER, o padrão é o back real (FE-50)', async () => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', undefined)
    vi.stubEnv('VITE_WEBSOCKET_URL', 'http://localhost:8080')
    expect(isMockServerEnabled()).toBe(false)
    expect(await createGameConnection()).toBeInstanceOf(StompConnection)
  })

  it('com opções do simulado (a vitrine), usa o simulado mesmo desligado', async () => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
    expect(await createGameConnection({ scenario: SCENARIOS.normal })).toBeInstanceOf(
      MockConnection,
    )
  })

  it('com VITE_USE_MOCK_SERVER=false usa o cliente STOMP real', async () => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
    vi.stubEnv('VITE_WEBSOCKET_URL', 'http://localhost:8080')
    expect(isMockServerEnabled()).toBe(false)
    expect(await createGameConnection()).toBeInstanceOf(StompConnection)
  })

  it('real sem VITE_WEBSOCKET_URL avisa a configuração que falta', async () => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
    vi.stubEnv('VITE_WEBSOCKET_URL', '')
    await expect(createGameConnection()).rejects.toThrow(/VITE_WEBSOCKET_URL/)
  })
})
