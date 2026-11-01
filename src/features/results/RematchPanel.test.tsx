import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import type { ClientCommand, ServerEvent } from '../../types/events'
import type { PlayerSlot, PlayerState } from '../../types/game'
import { RematchPanel } from './RematchPanel'

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
  roundsWon: slot === 'P1' ? 2 : 0,
  consecutiveTimeouts: 0,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
})

/** Resultado de uma partida entre Rafa (você, P1) e Vini */
function renderResult() {
  send('ROOM_SNAPSHOT', {
    code: '4821',
    phase: 'RESULT',
    players: [player('P1'), player('P2')],
    mySlot: 'P1',
    round: 2,
    suddenDeath: false,
    board: [],
    turn: null,
    myDeck: [],
    outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
    serverTime: Date.now(),
  })
  const router = createMemoryRouter(
    [
      { path: '/sala/:codigo', element: <RematchPanel /> },
      { path: '/', element: <p>Hub</p> },
    ],
    { initialEntries: ['/sala/4821'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const button = (name: string) => screen.getByRole('button', { name })
const deadline = () => Date.now() + 15_000

beforeEach(() => {
  resetGameStores()
  client.sendCommand.mockClear()
  client.leaveRoom.mockClear()
})

describe('RematchPanel', () => {
  it('pede revanche só com a intenção: a tela muda quando o servidor confirma', () => {
    renderResult()
    fireEvent.click(button('Revanche'))
    expect(client.sendCommand).toHaveBeenCalledWith({ type: 'REMATCH_REQUEST', payload: {} })
    expect(button('Revanche')).toBeEnabled() // nada otimista

    send('REMATCH_REQUESTED', { by: 'P1', deadline: deadline() })
    expect(screen.getByRole('status')).toHaveTextContent('Revanche pedida! Esperando Vini aceitar…')
    expect(button('Revanche pedida')).toBeDisabled()
    expect(screen.getByRole('progressbar', { name: 'Tempo da revanche' })).toHaveAttribute(
      'aria-valuenow',
      '15',
    )
  })

  it('pedido do oponente: aceitar ou recusar dentro dos 15s', () => {
    renderResult()
    send('REMATCH_REQUESTED', { by: 'P2', deadline: deadline() })
    expect(screen.getByRole('status')).toHaveTextContent('Vini quer revanche!')
    expect(screen.queryByRole('button', { name: 'Revanche' })).not.toBeInTheDocument()

    fireEvent.click(button('Aceitar'))
    expect(client.sendCommand).toHaveBeenLastCalledWith({
      type: 'REMATCH_RESPOND',
      payload: { accept: true },
    })
    fireEvent.click(button('Recusar'))
    expect(client.sendCommand).toHaveBeenLastCalledWith({
      type: 'REMATCH_RESPOND',
      payload: { accept: false },
    })
  })

  it('oponente saiu: a revanche fica desabilitada na hora [RN-POS-02]', () => {
    renderResult()
    send('PLAYER_LEFT', { slot: 'P2' })
    expect(screen.getByRole('status')).toHaveTextContent('O oponente sentiu a pressão, neném!')
    expect(button('Revanche')).toBeDisabled()
    expect(button('Voltar ao Lobby')).toBeEnabled()
  })

  it('pedido do oponente que expirou: aviso e revanche desabilitada', () => {
    renderResult()
    send('REMATCH_REQUESTED', { by: 'P2', deadline: deadline() })
    send('REMATCH_CANCELLED', { reason: 'TIMEOUT' })
    send('ROOM_CLOSED', { reason: 'O tempo da revanche acabou.' })
    expect(screen.getByRole('status')).toHaveTextContent('O tempo para aceitar a revanche acabou.')
    expect(button('Revanche')).toBeDisabled()
  })

  it('Voltar ao Lobby sai da sala e vai para o Hub', () => {
    const router = renderResult()
    fireEvent.click(button('Voltar ao Lobby'))
    expect(client.leaveRoom).toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/')
  })
})
