import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import type { ClientCommand, ServerEvent } from '../../types/events'
import type { MatchOutcome, PlayerSlot, PlayerState } from '../../types/game'
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

const player = (slot: PlayerSlot): PlayerState => ({
  slot,
  userId: `u-${slot}`,
  nickname: slot === 'P1' ? 'Rafa' : 'Vini',
  character: slot === 'P1' ? 'X' : 'O',
  roundsWon: 0,
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
  onLeave?: () => void
}

/** Snapshot de reconexão direto no Resultado, entre Rafa (X) e Vini (O) */
function renderResult({ outcome, coins, mySlot = 'P1', onLeave }: ResultSetup) {
  send('ROOM_SNAPSHOT', {
    code: '4821',
    phase: 'RESULT',
    players: [player('P1'), player('P2')],
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

beforeEach(() => {
  resetGameStores()
  client.sendCommand.mockClear()
  client.leaveRoom.mockClear()
})

describe('ResultScreen', () => {
  it('mostra título, placar e os Coins que o servidor mandou, com a revanche ao lado', () => {
    renderResult({
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
      coins: { P1: 50, P2: 10 },
    })
    expect(screen.getByRole('heading', { name: 'Vitória' })).toBeInTheDocument()
    expect(screen.getByText('2 × 0')).toBeInTheDocument()
    expect(screen.getByText('+50 Coins')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Revanche' })).toBeInTheDocument()
  })

  it('lê o resultado do meu lado: sendo o P2 de uma vitória do P1, é derrota com os meus Coins', () => {
    renderResult({
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 1] },
      coins: { P1: 50, P2: 10 },
      mySlot: 'P2',
    })
    expect(screen.getByRole('heading', { name: 'Derrota' })).toBeInTheDocument()
    expect(screen.getByText('1 × 2')).toBeInTheDocument()
    expect(screen.getByText('+10 Coins')).toBeInTheDocument()
  })

  it('derrota por W.O. mostra "0 Coins", sem o "+" de um crédito que não houve', () => {
    renderResult({
      outcome: { kind: 'WO', winner: 'P2' },
      coins: { P1: 0, P2: 30 },
    })
    expect(screen.getByRole('heading', { name: 'Derrota por W.O.' })).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Empate absoluto' })).toBeInTheDocument()
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
