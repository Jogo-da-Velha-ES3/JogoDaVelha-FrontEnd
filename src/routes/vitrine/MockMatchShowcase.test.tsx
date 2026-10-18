import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import type { MatchOutcome, PlayerSlot, PlayerState } from '../../types/game'
import { MockMatchShowcase } from './MockMatchShowcase'

const player = (slot: PlayerSlot, roundsWon: number): PlayerState => ({
  slot,
  userId: `u-${slot}`,
  nickname: slot === 'P1' ? 'Você' : 'Oponente Simulado',
  character: slot === 'P1' ? 'X' : 'O',
  roundsWon,
  consecutiveTimeouts: 0,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
})

/** O servidor manda o Resultado: o quadro da vitrine mostra a fase RESULT, sem rodar a partida */
function showResult(outcome: MatchOutcome, rounds: [number, number]) {
  render(
    <MemoryRouter>
      <MockMatchShowcase />
    </MemoryRouter>,
  )
  act(() =>
    applyServerEvent({
      type: 'ROOM_SNAPSHOT',
      serverTime: Date.now(),
      payload: {
        code: '0000',
        phase: 'RESULT',
        players: [player('P1', rounds[0]), player('P2', rounds[1])],
        mySlot: 'P1',
        round: 2,
        suddenDeath: false,
        board: [],
        turn: null,
        myDeck: [],
        outcome,
        serverTime: Date.now(),
      },
    }),
  )
}

beforeEach(() => resetGameStores())

// Regressão: a vitrine tinha uma tela de Resultado própria que juntava dois textos no título
// ("Derrota · Vitória"). Agora ela usa a ResultScreen de verdade, e o título tem um texto só.
describe('vitrine: título do Resultado', () => {
  it.each<[string, MatchOutcome, [number, number], string]>([
    ['derrota', { kind: 'WIN', winner: 'P2', score: [0, 2] }, [0, 2], 'Derrota'],
    ['derrota por W.O.', { kind: 'WO', winner: 'P2' }, [0, 1], 'Derrota por W.O.'],
  ])('%s mostra só "%s"', (_, outcome, rounds, title) => {
    showResult(outcome, rounds)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe(title)
    expect(h1.textContent).not.toContain('·')
  })
})
