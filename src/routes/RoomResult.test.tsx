import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREPARATION_SECONDS } from '../constants/game'
import { resetLiveResultMemory } from '../features/results/useLiveResult'
import { getMockControls } from '../sockets/gameClient'
import { MOCK_TIMINGS } from '../sockets/mock/mockServer'
import { useAuthStore } from '../stores/authStore'
import { useMatchStore } from '../stores/matchStore'
import { resetGameStores } from '../stores/serverEvents'
import { routes } from './routes'

const NET = 200 // folga para a "rede" simulada (80ms ida e volta)
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

function renderRoom(scenario: string) {
  window.history.replaceState({}, '', `/?cenario=${scenario}`)
  const router = createMemoryRouter(routes, { initialEntries: ['/sala/4821'] })
  render(<RouterProvider router={router} />)
}

const title = (name: string) => screen.queryByRole('heading', { name })

/** Da entrada até a Preparação acabar (ela fecha sozinha em 20s) e o Confronto passar */
async function toRounds() {
  await tick(NET + MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched + NET)
  await tick(PREPARATION_SECONDS * 1000 + MOCK_TIMINGS.versus + NET)
}

// O simulado é carregado sob demanda; carregar antes deixa o import() da sala instantâneo
beforeAll(async () => {
  await Promise.all([import('../sockets/mock/mockConnection'), import('../sockets/mock/scenarios')])
})

beforeEach(() => {
  vi.useFakeTimers()
  resetGameStores()
  resetLiveResultMemory()
  useAuthStore.getState().login('token-teste')
})

afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState({}, '', '/')
})

describe('Resultado na sala real (FE-15)', () => {
  // Título e Coins vêm do servidor simulado; o resto de cada tipo já é testado nas tasks anteriores
  it.each([
    ['vitoria', 'Vitória impecável', '+50 Coins'],
    ['derrota', 'Derrota', '+10 Coins'],
    ['empate-absoluto', 'Empate absoluto', '+20 Coins'],
    ['wo', 'Vitória por W.O.', '+30 Coins'],
    ['derrota-wo', 'Derrota por W.O.', '0 Coins'],
  ])(
    'cenário %s chega ao Resultado "%s" com %s',
    async (scenario, heading, coins) => {
      renderRoom(scenario)
      await toRounds()
      // No "wo" o robô não joga: eu preciso jogar nos meus turnos para não perder por tempo
      for (let i = 0; i < 160 && !title(heading); i++) {
        if (scenario === 'wo' && screen.queryByText('Sua vez')) {
          fireEvent.click(
            within(screen.getByRole('group', { name: 'Tabuleiro' })).getAllByRole('button')[0],
          )
        }
        await tick(scenario === 'wo' ? 500 : 1000)
      }
      expect(title(heading)).toBeInTheDocument()
      expect(screen.getByText(coins)).toBeInTheDocument()
    },
    60_000,
  )

  it('cair e voltar cruzando o MATCH_END: Resultado uma vez, estático e com o valor do servidor', async () => {
    renderRoom('vitoria')
    await toRounds()
    for (let i = 0; i < 40 && !screen.queryByText(/Round 2/); i++) await tick(500)
    expect(screen.getByText(/Round 2/)).toBeInTheDocument()

    // A conexão cai durante o round 2 e só volta depois de a partida acabar (MATCH_END perdido)
    act(() => getMockControls()?.simulateDrop(9000))
    await tick(9000 + NET)

    // O snapshot levou direto ao Resultado: uma tela só, com os Coins do servidor, parados
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(title('Vitória impecável')).toBeInTheDocument()
    expect(screen.getByText('+50 Coins')).toBeInTheDocument()
    const value = document.querySelector('[data-coins-value]')!
    expect(value.textContent).toBe('50')
    expect(value.hasAttribute('data-counting')).toBe(false) // sem contagem
    expect(document.querySelector('[data-region="result-burst"]')).toBeNull() // sem festa
    expect(screen.queryByText('Reconectando…')).not.toBeInTheDocument()

    // Nada foi somado nem repetido: o valor é o que o servidor mandou, e fica assim
    await tick(5000)
    expect(document.querySelector('[data-coins-value]')!.textContent).toBe('50')
    expect(useMatchStore.getState().coins).toEqual({ P1: 50, P2: 10 })
  }, 60_000)
})
