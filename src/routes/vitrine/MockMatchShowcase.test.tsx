import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREPARATION_SECONDS } from '../../constants/game'
import { MOCK_TIMINGS } from '../../sockets/mock/mockServer'
import { resetGameStores } from '../../stores/serverEvents'
import { MockMatchShowcase } from './MockMatchShowcase'

const NET = 200 // folga para a "rede" simulada (80ms ida e volta)
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

beforeAll(async () => {
  await Promise.all([
    import('../../sockets/mock/mockConnection'),
    import('../../sockets/mock/scenarios'),
  ])
})

beforeEach(() => {
  vi.useFakeTimers()
  resetGameStores()
})

afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState({}, '', '/')
})

/** Abre a vitrine já com o cenário e deixa a partida correr até o Resultado */
async function playUntilResult(scenario: string) {
  window.history.replaceState({}, '', `/?cenario=${scenario}`)
  render(
    <MemoryRouter>
      <MockMatchShowcase />
    </MemoryRouter>,
  )
  await tick(NET + MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched + NET)
  await tick(PREPARATION_SECONDS * 1000 + MOCK_TIMINGS.versus + NET)
  for (let i = 0; i < 160 && !screen.queryByRole('group', { name: 'Revanche' }); i++) {
    await tick(500)
  }
  expect(screen.getByRole('group', { name: 'Revanche' })).toBeInTheDocument()
}

// Regressão: a vitrine tinha uma tela de Resultado própria que juntava dois textos no título
// ("Derrota · Vitória"). Agora ela usa a ResultScreen de verdade, e o título tem um texto só.
describe('vitrine: título do Resultado', () => {
  it.each([
    ['derrota', 'Derrota'],
    ['derrota-wo', 'Derrota por W.O.'],
  ])('cenário %s mostra só "%s"', async (scenario, title) => {
    await playUntilResult(scenario)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe(title)
    expect(h1.textContent).not.toContain('·')
  })
})
