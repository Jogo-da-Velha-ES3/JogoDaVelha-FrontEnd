import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COINS_COUNT_SECONDS } from '../../constants/game'
import { useMatchStore } from '../../stores/matchStore'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import type { ClientCommand, ServerEvent } from '../../types/events'
import type { MatchOutcome, PlayerSlot, PlayerState } from '../../types/game'
import { ResultScreen } from './ResultScreen'
import { resetLiveResultMemory } from './useLiveResult'

const client = vi.hoisted(() => ({
  sendCommand: vi.fn<(command: ClientCommand) => void>(),
  leaveRoom: vi.fn<() => void>(),
}))
vi.mock('../../sockets/gameClient', () => client)

// "Reduzir movimento" controlado pelo teste
const motion = vi.hoisted(() => ({ reduced: false }))
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => motion.reduced,
}))

function send<T extends ServerEvent['type']>(
  type: T,
  payload: Extract<ServerEvent, { type: T }>['payload'],
) {
  act(() => applyServerEvent({ type, payload, serverTime: Date.now() } as never))
}

const player = (slot: PlayerSlot, roundsWon: number): PlayerState => ({
  slot,
  userId: `u-${slot}`,
  nickname: slot === 'P1' ? 'Rafa' : 'Vini',
  character: slot === 'P1' ? 'X' : 'O',
  roundsWon,
  consecutiveTimeouts: 0,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
})

interface Result {
  outcome: MatchOutcome
  rounds: [number, number]
  coins?: Record<PlayerSlot, number>
}

// Eu sou o P1. Os valores abaixo são só entrada dos testes: a tela nunca os calcula.
const WIN: Result = {
  outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
  rounds: [2, 0],
  coins: { P1: 50, P2: 10 },
}
const WO_LOSS: Result = {
  outcome: { kind: 'WO', winner: 'P2' },
  rounds: [0, 1],
  coins: { P1: 0, P2: 30 },
}
const DRAW: Result = {
  outcome: { kind: 'ABSOLUTE_DRAW' },
  rounds: [1, 1],
  coins: { P1: 20, P2: 20 },
}

/** Snapshot da sala: com resultado é o estado final (reconexão); sem, ele ainda não chegou */
function snapshot(result: Result | null, phase: 'RESULT' | 'ROUND_END' = 'RESULT') {
  const rounds = result?.rounds ?? [0, 0]
  send('ROOM_SNAPSHOT', {
    code: '4821',
    phase,
    players: [player('P1', rounds[0]), player('P2', rounds[1])],
    mySlot: 'P1',
    round: 2,
    suddenDeath: false,
    board: [],
    turn: null,
    myDeck: [],
    outcome: result?.outcome ?? null,
    coins: result?.coins,
    serverTime: Date.now(),
  })
}

/** O resultado chega agora, pelo MATCH_END */
function liveSetup(result: Result, coins = result.coins) {
  snapshot(null, 'ROUND_END')
  send('ROUND_START', { round: 2, startingPlayer: 'P1', suddenDeath: false })
  send('MATCH_END', { outcome: result.outcome, coins: coins! })
}

function renderScreen() {
  const router = createMemoryRouter(
    [
      { path: '/sala/:codigo', element: <ResultScreen /> },
      { path: '/', element: <p>Hub</p> },
    ],
    { initialEntries: ['/sala/4821'] },
  )
  return render(<RouterProvider router={router} />)
}

const numberEl = () => document.querySelector('[data-coins-value]')!
const shown = () => numberEl().textContent
const counting = () => numberEl().hasAttribute('data-counting')
// Assíncrono: a conclusão da contagem chega por uma promise do Framer Motion
const advance = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
  resetGameStores()
  resetLiveResultMemory()
  motion.reduced = false
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Coins do Resultado', () => {
  it('conta de 0 até o valor do servidor (+50) e não altera saldo nem armazenamento', async () => {
    liveSetup(WIN)
    const storage = () => JSON.stringify([{ ...localStorage }, { ...sessionStorage }])
    const before = storage()
    renderScreen()

    expect(shown()).toBe('0')
    expect(counting()).toBe(true)
    await advance((COINS_COUNT_SECONDS * 1000) / 2)
    const mid = Number(shown())
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(50)

    await advance(COINS_COUNT_SECONDS * 1000)
    expect(shown()).toBe('50')
    expect(counting()).toBe(false)
    expect(screen.getByText('+50 Coins')).toBeInTheDocument() // o que o leitor de tela lê

    // Só leitura: a tela não escreveu na store nem em armazenamento nenhum
    expect(useMatchStore.getState().coins).toEqual({ P1: 50, P2: 10 })
    expect(storage()).toBe(before)
  })

  it('MATCH_END repetido não reinicia a contagem; outro valor para a mesma partida para tudo e fica parado', async () => {
    liveSetup(WIN)
    renderScreen()
    await advance(500)
    const mid = Number(shown())

    send('MATCH_END', { outcome: WIN.outcome, coins: WIN.coins! }) // repetido
    expect(counting()).toBe(true)
    expect(Number(shown())).toBeGreaterThanOrEqual(mid) // não voltou a 0

    await advance(200)
    send('MATCH_END', { outcome: WIN.outcome, coins: { P1: 40, P2: 10 } }) // valor diferente
    expect(shown()).toBe('40')
    expect(counting()).toBe(false)
    await advance(COINS_COUNT_SECONDS * 1000)
    expect(shown()).toBe('40') // nada recomeçou
    expect(screen.getByText('+40 Coins')).toBeInTheDocument()
  })

  it('reconexão e remontagem mostram o valor final parado, sem contar de novo', async () => {
    snapshot(WIN) // reconectou direto no Resultado
    const first = renderScreen()
    expect(shown()).toBe('50')
    expect(counting()).toBe(false)
    first.unmount()

    resetGameStores()
    liveSetup(WIN) // ao vivo: conta uma vez...
    const second = renderScreen()
    expect(counting()).toBe(true)
    await advance(300)
    second.unmount() // ...e a tela some e volta (ex: a espera da Arena)
    renderScreen()
    expect(shown()).toBe('50')
    expect(counting()).toBe(false)
  })

  it('zero fica parado e atenuado, sem "+"; sem valor mostra "Coins já creditados"', async () => {
    liveSetup(WO_LOSS)
    const first = renderScreen()
    expect(shown()).toBe('0')
    expect(counting()).toBe(false)
    expect(screen.getByText('0 Coins')).toBeInTheDocument()
    expect(numberEl().closest('p')).toHaveClass('opacity-60')
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
    first.unmount()

    resetGameStores()
    snapshot({ ...WIN, coins: undefined }) // o snapshot não trouxe os Coins
    renderScreen()
    expect(screen.getByText('Coins já creditados')).toBeInTheDocument()
    expect(document.querySelector('[data-coins-value]')).toBeNull()
  })

  it('"reduzir movimento": o valor final aparece direto, sem contagem', async () => {
    motion.reduced = true
    liveSetup(WIN)
    renderScreen()
    expect(shown()).toBe('50')
    expect(counting()).toBe(false)
  })

  it('empate: a Arena já mostrou "+20 para cada", então o valor fica parado, com "para os dois"', async () => {
    liveSetup(DRAW)
    renderScreen()
    expect(shown()).toBe('20')
    expect(counting()).toBe(false)
    expect(screen.getByText('+20 Coins')).toBeInTheDocument()
    expect(screen.getByText('para os dois')).toBeInTheDocument()
  })
})
