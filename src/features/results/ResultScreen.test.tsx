import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESULT_TEXTS } from '../../constants/texts'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import type { ClientCommand, ServerEvent } from '../../types/events'
import type { CharacterId, MatchOutcome, PlayerSlot, PlayerState } from '../../types/game'
import { ResultScreen } from './ResultScreen'

const client = vi.hoisted(() => ({
  sendCommand: vi.fn<(command: ClientCommand) => void>(),
  leaveRoom: vi.fn<() => void>(),
}))
vi.mock('../../sockets/gameClient', () => client)

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

interface ResultSetup {
  outcome: MatchOutcome | null
  /** undefined = o snapshot não trouxe os Coins */
  coins?: Record<PlayerSlot, number>
  mySlot?: PlayerSlot
  /** Rounds vencidos por [P1, P2] no snapshot (placar do empate e do W.O.) */
  rounds?: [number, number]
  onLeave?: () => void
}

/** Snapshot de reconexão direto no Resultado, entre Rafa (P1, X) e Vini (P2, O) */
function renderResult({ outcome, coins, mySlot = 'P1', rounds = [0, 0], onLeave }: ResultSetup) {
  send('ROOM_SNAPSHOT', {
    code: '4821',
    phase: 'RESULT',
    players: [player('P1', rounds[0]), player('P2', rounds[1])],
    mySlot,
    round: 2,
    suddenDeath: false,
    board: [],
    turn: null,
    myDeck: [],
    outcome,
    coins,
    serverTime: Date.now(),
  })
  const router = createMemoryRouter(
    [
      { path: '/sala/:codigo', element: <ResultScreen onLeave={onLeave} /> },
      { path: '/', element: <p>Hub</p> },
    ],
    { initialEntries: ['/sala/4821'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const title = () => screen.getByRole('heading', { level: 1 })
const scoreLabel = (text: string) => screen.getByRole('img', { name: `Placar final: ${text}` })
/** Personagens do painel do resultado (a coluna da comemoração) */
const panelCharacters = () =>
  Array.from(document.querySelectorAll('[data-region="result-panel"] [data-character]')).map((e) =>
    e.getAttribute('data-character'),
  )
const side = (name: 'me' | 'opponent') => document.querySelector(`[data-side="${name}"]`)!

beforeEach(() => {
  resetGameStores()
  client.sendCommand.mockClear()
  client.leaveRoom.mockClear()
})

interface Case {
  name: string
  setup: ResultSetup
  title: string
  subtitle: string | null
  score: string
  tone: 'win' | 'loss' | 'draw'
  characters: CharacterId[]
  dimmed: 'me' | 'opponent' | null
  wo: boolean
  /** Rounds vencidos por mim e pelo oponente (pips) */
  pips: [number, number]
}

// Eu sou o P1 (X); o oponente é o P2 (O). X = #b07cff
const CASES: Case[] = [
  {
    name: 'vitória por 2×0',
    setup: {
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
      coins: { P1: 50, P2: 10 },
    },
    title: 'Vitória impecável',
    subtitle: 'Botou na mesa e mandou medir…',
    score: '2 × 0',
    tone: 'win',
    characters: ['X'],
    dimmed: 'opponent',
    wo: false,
    pips: [2, 0],
  },
  {
    name: 'vitória por 2×1 não é impecável',
    setup: {
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 1] },
      coins: { P1: 50, P2: 10 },
    },
    title: 'Vitória',
    subtitle: 'Botou na mesa e mandou medir…',
    score: '2 × 1',
    tone: 'win',
    characters: ['X'],
    dimmed: 'opponent',
    wo: false,
    pips: [2, 1],
  },
  {
    name: 'vitória por 1×0 não é impecável',
    setup: {
      outcome: { kind: 'WIN', winner: 'P1', score: [1, 0] },
      coins: { P1: 50, P2: 10 },
    },
    title: 'Vitória',
    subtitle: 'Botou na mesa e mandou medir…',
    score: '1 × 0',
    tone: 'win',
    characters: ['X'],
    dimmed: 'opponent',
    wo: false,
    pips: [1, 0],
  },
  {
    name: 'derrota por 0×2 (o personagem do painel é o de quem venceu)',
    setup: {
      outcome: { kind: 'WIN', winner: 'P2', score: [0, 2] },
      coins: { P1: 10, P2: 50 },
    },
    title: 'Derrota',
    subtitle: 'É a vergonha da profissão.',
    score: '0 × 2',
    tone: 'loss',
    characters: ['O'],
    dimmed: 'me',
    wo: false,
    pips: [0, 2],
  },
  {
    name: 'empate absoluto',
    setup: {
      outcome: { kind: 'ABSOLUTE_DRAW' },
      coins: { P1: 20, P2: 20 },
      rounds: [1, 1],
    },
    title: 'Empate absoluto',
    subtitle: null, // o placar já está na coluna da direita
    score: '1 × 1',
    tone: 'draw',
    characters: ['X', 'O'],
    dimmed: null,
    wo: false,
    pips: [1, 1],
  },
  {
    name: 'vitória por W.O.',
    setup: {
      outcome: { kind: 'WO', winner: 'P1' },
      coins: { P1: 30, P2: 0 },
      rounds: [1, 0],
    },
    title: 'Vitória por W.O.',
    subtitle: 'O oponente… arregou!',
    score: '1 × 0',
    tone: 'win',
    characters: ['X'],
    dimmed: 'opponent',
    wo: true,
    pips: [1, 0],
  },
  {
    name: 'derrota por W.O.',
    setup: {
      outcome: { kind: 'WO', winner: 'P2' },
      coins: { P1: 0, P2: 30 },
      rounds: [0, 1],
    },
    title: 'Derrota por W.O.',
    subtitle: 'Assoprou a velhinha errada, hein… entendeu?',
    score: '0 × 1',
    tone: 'loss',
    characters: ['O'],
    dimmed: 'me',
    wo: true,
    pips: [0, 1],
  },
]

describe('ResultScreen: um resultado, uma apresentação', () => {
  it.each(CASES)('$name', (c) => {
    renderResult(c.setup)

    // O título tem só o texto do próprio resultado: nada concatenado nem sobrando de outro
    expect(title().textContent).toBe(c.title)

    // Subtítulo
    const panel = document.querySelector('[data-region="result-panel"]')!
    const lines = Array.from(panel.querySelectorAll('p')).map((p) => p.textContent)
    expect(lines).toEqual(c.subtitle ? [c.subtitle] : [])

    // Placar do meu ponto de vista e rounds vencidos
    expect(scoreLabel(c.score)).toBeInTheDocument()
    expect(side('me').querySelector('[data-rounds-won]')).toHaveAttribute(
      'data-rounds-won',
      String(c.pips[0]),
    )
    expect(side('opponent').querySelector('[data-rounds-won]')).toHaveAttribute(
      'data-rounds-won',
      String(c.pips[1]),
    )

    // Cor do título: meu personagem (X, #b07cff) na vitória, perigo na derrota, neutro no empate
    expect(title().style.color).toBe(c.tone === 'win' ? 'rgb(176, 124, 255)' : '')
    expect(title().classList.contains('text-danger')).toBe(c.tone === 'loss')
    expect(title().classList.contains('text-text')).toBe(c.tone === 'draw')
    // Todos têm brilho: vitória e derrota na cor do título (inline); o empate, neutro e mais
    // fraco (30%), por classe
    expect(title().style.textShadow !== '').toBe(c.tone !== 'draw')
    expect(title().className.includes('var(--color-text)_30%')).toBe(c.tone === 'draw')

    // Nenhum resultado tem a legenda "Placar final": o placar é só o da coluna da direita
    expect(screen.queryByText(/Placar final/)).not.toBeInTheDocument()
    // Personagem(ns) do painel, quem fica atenuado e a etiqueta de W.O.
    expect(panelCharacters()).toEqual(c.characters)
    expect(side('me').hasAttribute('data-dimmed')).toBe(c.dimmed === 'me')
    expect(side('opponent').hasAttribute('data-dimmed')).toBe(c.dimmed === 'opponent')
    expect(screen.queryByText('W.O.', { selector: 'span' }) !== null).toBe(c.wo)
  })

  it('a tabela cobre os seis títulos, e nenhum deles junta dois textos', () => {
    expect(new Set(CASES.map((c) => c.title))).toEqual(new Set(Object.values(RESULT_TEXTS.titles)))
    for (const c of CASES) expect(c.title).not.toContain('·')
  })
  it('vendo do outro lado: sou o P2 de uma vitória 2×0 do P1, então é derrota com os meus Coins', () => {
    renderResult({
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
      coins: { P1: 50, P2: 10 },
      mySlot: 'P2',
    })
    expect(title().textContent).toBe('Derrota') // sem "impecável" para quem perde
    expect(scoreLabel('0 × 2')).toBeInTheDocument()
    expect(panelCharacters()).toEqual(['X']) // o painel mostra quem venceu
    expect(screen.getByText('+10 Coins')).toBeInTheDocument()
  })
})

describe('ResultScreen: Coins, espera e saída', () => {
  it('mostra os Coins que o servidor mandou, com a revanche ao lado', () => {
    renderResult({
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
      coins: { P1: 50, P2: 10 },
    })
    expect(screen.getByText('+50 Coins')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Revanche' })).toBeInTheDocument()
  })

  it('derrota por W.O. mostra "0 Coins", sem o "+" de um crédito que não houve', () => {
    renderResult({
      outcome: { kind: 'WO', winner: 'P2' },
      coins: { P1: 0, P2: 30 },
    })
    expect(screen.getByText('0 Coins')).toBeInTheDocument()
    expect(screen.queryByText(/\+0/)).not.toBeInTheDocument()
  })

  it('snapshot sem Coins: texto neutro, sem inventar valor', () => {
    renderResult({ outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] } })
    expect(screen.getByText('Coins já creditados')).toBeInTheDocument()
    expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument()
  })

  it('sem resultado do servidor: espera, não cai em "Derrota", e mantém a saída pelo Lobby', () => {
    renderResult({ outcome: null })
    expect(screen.getByText('Apurando o resultado…')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByText(/Derrota/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar ao Lobby' })).toBeEnabled()
  })

  it('o MATCH_END que chega depois troca a espera pelo resultado', () => {
    renderResult({ outcome: null })
    send('MATCH_END', {
      outcome: { kind: 'ABSOLUTE_DRAW' },
      coins: { P1: 20, P2: 20 },
    })
    expect(title().textContent).toBe('Empate absoluto')
    expect(screen.getByText('+20 Coins')).toBeInTheDocument()
  })

  it('"Voltar ao Lobby" usa o onLeave recebido', () => {
    const onLeave = vi.fn<() => void>()
    renderResult({
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
      coins: { P1: 50, P2: 10 },
      onLeave,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao Lobby' }))
    expect(onLeave).toHaveBeenCalledTimes(1)
    expect(client.leaveRoom).not.toHaveBeenCalled()
  })
})
