import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RESULT_BURST_PARTICLES, RESULT_BURST_SECONDS } from '../../constants/game'
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
  coins: Record<PlayerSlot, number>
}

// Eu sou o P1 (X)
const FLAWLESS: Result = {
  outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
  rounds: [2, 0],
  coins: { P1: 50, P2: 10 },
}
const WIN: Result = {
  outcome: { kind: 'WIN', winner: 'P1', score: [2, 1] },
  rounds: [2, 1],
  coins: { P1: 50, P2: 10 },
}
const WO_WIN: Result = {
  outcome: { kind: 'WO', winner: 'P1' },
  rounds: [1, 0],
  coins: { P1: 30, P2: 0 },
}
const LOSS: Result = {
  outcome: { kind: 'WIN', winner: 'P2', score: [0, 2] },
  rounds: [0, 2],
  coins: { P1: 10, P2: 50 },
}
const DRAW: Result = {
  outcome: { kind: 'ABSOLUTE_DRAW' },
  rounds: [1, 1],
  coins: { P1: 20, P2: 20 },
}
const WO_LOSS: Result = {
  outcome: { kind: 'WO', winner: 'P2' },
  rounds: [0, 1],
  coins: { P1: 0, P2: 30 },
}

/** Snapshot da sala: com `result` é o estado final (reconexão); sem, o resultado ainda não chegou */
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

/** O resultado chega agora, pelo MATCH_END, depois de um round que o servidor iniciou */
function matchEnd(result: Result) {
  send('MATCH_END', { outcome: result.outcome, coins: result.coins })
}

function liveSetup(result: Result) {
  snapshot(null, 'ROUND_END')
  send('ROUND_START', { round: 2, startingPlayer: 'P1', suddenDeath: false })
  matchEnd(result)
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

const burst = () => document.querySelector('[data-region="result-burst"]')
const particles = () => document.querySelectorAll('[data-particle]').length
const halo = () => document.querySelector('[data-region="result-halo"]')
const title = () => screen.getByRole('heading', { level: 1 })
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

beforeEach(() => {
  vi.useFakeTimers()
  resetGameStores()
  resetLiveResultMemory()
  motion.reduced = false
  client.sendCommand.mockClear()
  client.leaveRoom.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('comemoração: só na vitória ao vivo', () => {
  it.each<[string, Result, number]>([
    ['vitória impecável (2×0): rajada maior', FLAWLESS, RESULT_BURST_PARTICLES.flawless],
    ['vitória comum (2×1)', WIN, RESULT_BURST_PARTICLES.win],
    ['vitória por W.O.: versão curta', WO_WIN, RESULT_BURST_PARTICLES.short],
  ])('%s', (_, result, count) => {
    liveSetup(result)
    renderScreen()
    expect(particles()).toBe(count)
    expect(halo()).toHaveClass('animate-glow-pulse')
  })

  it.each<[string, Result]>([
    ['derrota', LOSS],
    ['empate absoluto', DRAW],
    ['derrota por W.O.', WO_LOSS],
  ])('%s: sem partículas e sem brilho de festa, mesmo ao vivo', (_, result) => {
    liveSetup(result)
    renderScreen()
    expect(burst()).toBeNull()
    expect(particles()).toBe(0)
    expect(halo()).toBeNull()
    expect(document.querySelector('.animate-victory-hop')).toBeNull()
  })

  it('quem reconecta direto no Resultado (snapshot) vê o estado final, sem rajada nem pulo', () => {
    snapshot(FLAWLESS)
    renderScreen()
    expect(burst()).toBeNull()
    expect(document.querySelector('.animate-victory-hop')).toBeNull()
    expect(title().querySelector('span')).toBeNull() // sem cintilação
    // O brilho do vencedor fica, parado
    expect(halo()).not.toBeNull()
    expect(halo()).not.toHaveClass('animate-glow-pulse')
  })

  it('"reduzir movimento": estado final parado, sem partículas, pulo nem cintilação', () => {
    motion.reduced = true
    liveSetup(FLAWLESS)
    renderScreen()
    expect(burst()).toBeNull()
    expect(document.querySelector('.animate-victory-hop')).toBeNull()
    expect(title().querySelector('span')).toBeNull()
    expect(halo()).not.toHaveClass('animate-glow-pulse')
    expect(title().textContent).toBe('Vitória impecável')
  })

  it('o resultado que chega depois da espera também é ao vivo', () => {
    snapshot(null) // Resultado aberto, MATCH_END ainda não chegou
    renderScreen()
    expect(screen.getByText('Apurando o resultado…')).toBeInTheDocument()
    expect(burst()).toBeNull()

    send('ROUND_START', { round: 2, startingPlayer: 'P1', suddenDeath: false })
    matchEnd(WIN)
    expect(particles()).toBe(RESULT_BURST_PARTICLES.win)
  })
})

describe('comemoração: tempo e reinício', () => {
  it('a rajada some depois do prazo e o estado final continua na tela', () => {
    liveSetup(WIN)
    renderScreen()
    advance(RESULT_BURST_SECONDS * 1000 - 1)
    expect(burst()).not.toBeNull()

    advance(1)
    expect(burst()).toBeNull()
    expect(particles()).toBe(0)
    expect(title().textContent).toBe('Vitória')
    expect(halo()).not.toBeNull()
  })

  it('MATCH_END repetido durante a festa não reinicia: é a mesma camada, com as mesmas partículas', () => {
    liveSetup(FLAWLESS)
    renderScreen()
    advance(1000)
    const layer = burst()
    expect(layer).not.toBeNull()

    matchEnd(FLAWLESS)
    expect(burst()).toBe(layer)
    expect(particles()).toBe(RESULT_BURST_PARTICLES.flawless)

    // O relógio da rajada também não foi reiniciado: some no prazo original
    advance(RESULT_BURST_SECONDS * 1000 - 1000)
    expect(burst()).toBeNull()
  })

  it('MATCH_END repetido depois da festa não a toca de novo', () => {
    liveSetup(WIN)
    renderScreen()
    advance(RESULT_BURST_SECONDS * 1000)
    expect(burst()).toBeNull()

    matchEnd(WIN)
    advance(10)
    expect(burst()).toBeNull()
    expect(particles()).toBe(0)
  })

  it('reconexão (snapshot) depois da festa não a repete', () => {
    liveSetup(WIN)
    renderScreen()
    advance(RESULT_BURST_SECONDS * 1000)

    snapshot(WIN)
    advance(10)
    expect(burst()).toBeNull()
    expect(title().textContent).toBe('Vitória')
  })

  it('reconexão durante a festa não a corta nem a reinicia', () => {
    liveSetup(WIN)
    renderScreen()
    advance(1000)
    const layer = burst()

    snapshot(WIN)
    expect(burst()).toBe(layer)
    advance(RESULT_BURST_SECONDS * 1000 - 1000)
    expect(burst()).toBeNull()
  })

  it('a tela desmontada e montada de novo para o mesmo resultado não repete a festa', () => {
    liveSetup(FLAWLESS)
    const first = renderScreen()
    expect(particles()).toBe(RESULT_BURST_PARTICLES.flawless)
    first.unmount()

    matchEnd(FLAWLESS) // chega de novo e reabre a espera da Arena na sala; ao voltar, é o mesmo resultado
    renderScreen()
    expect(burst()).toBeNull()
    expect(title().textContent).toBe('Vitória impecável')
  })

  it('uma revanche com o mesmo resultado volta a ser ao vivo (novo ROUND_START)', () => {
    liveSetup(FLAWLESS)
    renderScreen().unmount()

    send('PHASE_CHANGE', { phase: 'DRAFT' }) // revanche aceita: tudo recomeça
    advance(5)
    liveSetup(FLAWLESS)
    renderScreen()
    expect(particles()).toBe(RESULT_BURST_PARTICLES.flawless)
  })
})

describe('comemoração: cintilação, pulo e posição', () => {
  it('só a vitória impecável cintila (neon), e o título continua com o texto exato', () => {
    liveSetup(FLAWLESS)
    renderScreen()
    expect(title().querySelector('span')).toHaveClass('motion-safe:animate-neon-flicker')
    expect(title().textContent).toBe('Vitória impecável')
  })

  it('vitória comum e por W.O. não cintilam', () => {
    liveSetup(WIN)
    renderScreen()
    expect(title().querySelector('span')).toBeNull()
  })

  it('o vencedor pula (finito) ao vivo, com o personagem animado', () => {
    liveSetup(WIN)
    renderScreen()
    expect(document.querySelector('.animate-victory-hop')).not.toBeNull()
    expect(document.querySelector('[data-region="result-panel"] svg')).toHaveClass('chr-animated')
  })

  it.each([
    ['derrota', LOSS],
    ['empate absoluto', DRAW],
    ['derrota por W.O.', WO_LOSS],
  ])('%s: personagens com a animação normal, sem festa', (_, result) => {
    liveSetup(result)
    renderScreen()
    const characters = document.querySelectorAll('[data-region="result-panel"] svg[data-character]')
    expect(characters.length).toBeGreaterThan(0)
    characters.forEach((svg) => expect(svg).toHaveClass('chr-animated'))
    expect(document.querySelector('.animate-victory-hop')).toBeNull()
    expect(burst()).toBeNull()
  })

  it('a rajada fica dentro do painel, sem capturar toques, e a coluna dos botões não recebe partículas', () => {
    liveSetup(FLAWLESS)
    renderScreen()
    const panel = document.querySelector('[data-region="result-panel"]')!
    const layer = burst()!
    expect(panel.contains(layer)).toBe(true)
    expect(layer).toHaveClass('pointer-events-none', 'overflow-hidden')
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    const right = panel.nextElementSibling!
    expect(right.querySelector('[data-particle]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Revanche' })).toBeEnabled()
  })
})
