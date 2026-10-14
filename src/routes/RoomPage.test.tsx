import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREPARATION_SECONDS, TURN_DURATION_SECONDS } from '../constants/game'
import { MOCK_TIMINGS } from '../sockets/mock/mockServer'
import { useAuthStore } from '../stores/authStore'
import { resetGameStores } from '../stores/serverEvents'
import { routes } from './routes'

const NET = 200 // folga para a "rede" simulada (80ms ida e volta)

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

function renderRoom(scenario: string) {
  // O simulado lê o cenário da URL (?cenario=)
  window.history.replaceState({}, '', `/?cenario=${scenario}`)
  const router = createMemoryRouter(routes, { initialEntries: ['/sala/4821'] })
  render(<RouterProvider router={router} />)
  return router
}

const board = () => screen.getByRole('group', { name: 'Tabuleiro' })
const emptyCells = () => within(board()).queryAllByRole('button')

/** Da entrada até o round 1 em jogo (a Preparação acaba sozinha em 20s) */
async function toPlaying() {
  await tick(NET + MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched + NET)
  await tick(PREPARATION_SECONDS * 1000 + MOCK_TIMINGS.versus + NET)
  await tick(8000 + NET) // sorteio da 3ª
}

async function waitForMyTurn() {
  for (let i = 0; i < 10 && !screen.queryByText('Sua vez'); i++) await tick(1500)
  expect(screen.getByText('Sua vez')).toBeInTheDocument()
}

beforeEach(() => {
  vi.useFakeTimers()
  resetGameStores()
  useAuthStore.getState().login('token-teste')
})

afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState({}, '', '/')
})

describe('sala: a tela sai da fase', () => {
  it('Sala de Espera → Match feito → Preparação → Arena → Resultado (cenário vitória)', async () => {
    const router = renderRoom('vitoria')
    await tick(NET)
    expect(screen.getByText('Aguardando adversário…')).toBeInTheDocument()

    await tick(MOCK_TIMINGS.botJoin + NET)
    expect(screen.getByText('Match feito! Oponente Simulado entrou!')).toBeInTheDocument()

    await tick(MOCK_TIMINGS.matched + NET)
    expect(screen.getByRole('heading', { name: 'Preparação' })).toBeInTheDocument()

    await tick(PREPARATION_SECONDS * 1000 + NET)
    expect(board()).toBeInTheDocument()
    expect(screen.getByText(/vs Oponente Simulado/)).toBeInTheDocument() // banner do Confronto

    await tick(30_000)
    expect(screen.getByRole('heading', { name: 'Vitória' })).toBeInTheDocument()
    expect(screen.getByText('2 × 0')).toBeInTheDocument()
    expect(screen.getByText('+50 Coins')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao Hub' }))
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('Arena', () => {
  it('jogada pelo tabuleiro: manda a intenção e só muda com a resposta do servidor', async () => {
    renderRoom('normal')
    await toPlaying()
    await waitForMyTurn()
    expect(screen.getByRole('progressbar', { name: 'Seu tempo' })).toBeInTheDocument()

    const before = emptyCells().length
    fireEvent.click(emptyCells()[0])
    expect(emptyCells()).toHaveLength(before) // ainda sem resposta

    await tick(NET)
    expect(screen.getByText('Vez do oponente')).toBeInTheDocument()
    expect(emptyCells()).toHaveLength(0) // vez do oponente: nada clicável
    expect(within(board()).getAllByRole('img', { name: /vazia/ })).toHaveLength(before - 1)
    expect(screen.getByRole('progressbar', { name: 'Tempo do turno' })).toBeInTheDocument()
  })

  it('faixas mostram os dois jogadores e o espaço do Vitão fica vazio com a flag desligada', async () => {
    renderRoom('normal')
    await toPlaying()
    expect(screen.getByRole('region', { name: /^Oponente Simulado:/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /\(você\):/ })).toBeInTheDocument()

    const vitao = document.querySelector('[data-region="vitao"]')
    expect(vitao).toBeEmptyDOMElement()
    expect(screen.queryByText(/Vitão/)).not.toBeInTheDocument()
  })

  it('W.O.: a Arena segura o banner por 2s antes do Resultado', async () => {
    renderRoom('wo') // o bot não joga
    await toPlaying()
    // Quem começa é sorteado: o W.O. vem depois de 2 ou 3 jogadas suas
    const woBanner = () => screen.queryByText('Vitória por W.O.', { selector: 'p' })
    for (let i = 0; i < 5 && !woBanner(); i++) {
      if (screen.queryByText('Sua vez')) fireEvent.click(emptyCells()[0])
      await tick(NET + TURN_DURATION_SECONDS * 1000) // o bot estoura
    }

    expect(board()).toBeInTheDocument()
    expect(screen.getByText('Vitória por W.O.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Vitória por W.O.' })).not.toBeInTheDocument()

    await tick(2000 + NET)
    expect(screen.getByRole('heading', { name: 'Vitória por W.O.' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Tabuleiro' })).not.toBeInTheDocument()
  })
})
