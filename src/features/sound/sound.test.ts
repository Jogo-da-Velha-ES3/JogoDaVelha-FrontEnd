import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import { useBoardStore } from '../../stores/boardStore'
import { useRoomStore } from '../../stores/roomStore'
import type { ServerEvent } from '../../types/events'
import type { Cell, PlayerSlot } from '../../types/game'
import { playSound } from './soundManager'
import { COINS_DELAY_MS, SOUND_KEYS, soundUrl } from './soundMap'

vi.mock('./soundManager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./soundManager')>()
  return {
    ...actual,
    playSound: vi.fn<typeof actual.playSound>(),
    stopSound: vi.fn<typeof actual.stopSound>(),
  }
})

/** Os sons partem do mesmo ponto de entrada das stores, como na partida de verdade */
function send<T extends ServerEvent['type']>(
  type: T,
  payload: Extract<ServerEvent, { type: T }>['payload'],
) {
  applyServerEvent({ type, payload, serverTime: Date.now() } as never)
}

const board = (owners: Partial<Record<number, PlayerSlot>> = {}): Cell[] =>
  Array.from({ length: 16 }, (_, index) => ({ index, owner: owners[index] ?? null, effects: [] }))

const played = () => vi.mocked(playSound).mock.calls.map(([key]) => key)

beforeEach(() => {
  vi.useFakeTimers()
  resetGameStores()
  useRoomStore.setState({ mySlot: 'P1' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('mapa evento → som (FE-37)', () => {
  it('jogada só quando aparece uma peça nova no tabuleiro', () => {
    useBoardStore.setState({ cells: board({ 0: 'P1' }) })

    send('BOARD_UPDATE', { board: board({ 0: 'P1', 5: 'P2' }) }) // peça nova
    send('BOARD_UPDATE', { board: board({ 0: 'P1', 5: 'P2' }) }) // fim do turno: nada mudou
    send('BOARD_UPDATE', { board: board({ 5: 'P2' }) }) // Bomba: uma peça a menos
    send('BOARD_UPDATE', { board: board() }) // começo do round: tabuleiro vazio

    expect(played()).toEqual(['jogada'])
  })

  it('cada habilidade tem o seu som; o estouro de tempo e o fim do round também', () => {
    send('ABILITY_RESOLVED', {
      by: 'P2',
      ability: 'BURACO_NEGRO',
      targetCell: 3,
      destinationCell: null,
      absorbed: false,
      noEffect: false,
    })
    send('TURN_TIMEOUT', { player: 'P1', consecutiveTimeouts: 1 })
    send('ROUND_END', {
      round: 1,
      winner: 'P1',
      winningLine: [0, 1, 2, 3],
      score: { P1: 1, P2: 0 },
    })

    expect(played()).toEqual(['habilidade-BURACO_NEGRO', 'estouro-tempo', 'fim-round'])
  })

  it('o ROUND_START não toca nada: a sirene da Morte Súbita é na entrada, depois do sorteio', () => {
    send('ROUND_START', { round: 3, startingPlayer: 'P1', suddenDeath: true })
    expect(played()).toEqual([])
  })

  it('resultado e, um pouco depois, os Coins; MATCH_END repetido não toca de novo', () => {
    const loss: Extract<ServerEvent, { type: 'MATCH_END' }>['payload'] = {
      outcome: { kind: 'WIN', winner: 'P2', score: [0, 2] },
      coins: { P1: 10, P2: 50 },
    }
    send('MATCH_END', loss)
    expect(played()).toEqual(['derrota'])

    vi.advanceTimersByTime(COINS_DELAY_MS)
    expect(played()).toEqual(['derrota', 'coins'])

    send('MATCH_END', loss)
    vi.advanceTimersByTime(COINS_DELAY_MS)
    expect(played()).toEqual(['derrota', 'coins'])
  })

  it('empate absoluto toca o empate; derrota por W.O. (0 Coins) não toca os Coins', () => {
    send('MATCH_END', { outcome: { kind: 'ABSOLUTE_DRAW' }, coins: { P1: 20, P2: 20 } })
    vi.advanceTimersByTime(COINS_DELAY_MS)
    expect(played()).toEqual(['empate', 'coins'])

    resetGameStores()
    useRoomStore.setState({ mySlot: 'P1' })
    vi.mocked(playSound).mockClear()
    send('MATCH_END', { outcome: { kind: 'WO', winner: 'P2' }, coins: { P1: 0, P2: 30 } })
    vi.advanceTimersByTime(COINS_DELAY_MS)
    expect(played()).toEqual(['derrota'])
  })
})

describe('arquivos de som (src/assets/sounds)', () => {
  it('todo som do mapa tem arquivo', () => {
    expect(SOUND_KEYS.filter((key) => !soundUrl(key))).toEqual([])
  })
})
