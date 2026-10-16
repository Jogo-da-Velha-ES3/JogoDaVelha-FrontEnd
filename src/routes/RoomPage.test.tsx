import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREPARATION_SECONDS, TURN_DURATION_SECONDS } from '../constants/game'
import { getMockControls } from '../sockets/gameClient'
import { MOCK_TIMINGS } from '../sockets/mock/mockServer'
import { useAuthStore } from '../stores/authStore'
import { resetGameStores } from '../stores/serverEvents'
import { useToastStore } from '../stores/toastStore'
import { routes } from './routes'

const NET = 200 // folga para a "rede" simulada (80ms ida e volta)

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

function renderRoom(scenario: string, rematch = 'aceita') {
  // O simulado lê o cenário e o comportamento do bot no fim da URL (?cenario=, ?revanche=)
  window.history.replaceState({}, '', `/?cenario=${scenario}&revanche=${rematch}`)
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

// O simulado é carregado sob demanda; o carregamento do módulo leva tempo real, que os fake
// timers não adiantam. Carregar antes deixa o import() da sala instantâneo.
beforeAll(async () => {
  await Promise.all([import('../sockets/mock/mockConnection'), import('../sockets/mock/scenarios')])
})

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
    expect(screen.getByRole('status', { name: /vs Oponente Simulado/i })).toBeInTheDocument() // banner do Confronto (VsBanner)

    await tick(30_000)
    expect(screen.getByRole('heading', { name: 'Vitória' })).toBeInTheDocument()
    expect(screen.getByText('2 × 0')).toBeInTheDocument()
    expect(screen.getByText('+50 Coins')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao Lobby' }))
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('reconexão (FE-20)', () => {
  it('minha conexão cai: "Reconectando…", tabuleiro bloqueado e a partida volta pelo snapshot', async () => {
    renderRoom('wo') // o bot não joga: o tabuleiro só muda com as suas jogadas
    await toPlaying()
    await waitForMyTurn()
    fireEvent.click(emptyCells()[0])
    await tick(NET)
    const empty = () =>
      within(board()).queryAllByRole('img', { name: /vazia/ }).length + emptyCells().length
    expect(empty()).toBe(15)

    act(() => getMockControls()?.simulateDrop(3000))
    expect(screen.getByText('Reconectando…')).toBeInTheDocument()
    expect(emptyCells()).toHaveLength(0) // nada clicável enquanto cai

    await tick(3000 + NET)
    expect(screen.queryByText('Reconectando…')).not.toBeInTheDocument()
    // O snapshot remontou a partida: a sua peça continua lá e o turno do oponente segue
    expect(empty()).toBe(15)
    expect(screen.getByText('Vez de Oponente Simulado…')).toBeInTheDocument()
  })
})

describe('revanche (FE-29)', () => {
  /** Cenário "vitoria" até a tela de Resultado */
  async function toResult(rematch: string) {
    const router = renderRoom('vitoria', rematch)
    await tick(NET + MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched + NET)
    await tick(PREPARATION_SECONDS * 1000 + NET)
    await tick(30_000)
    expect(screen.getByRole('heading', { name: 'Vitória' })).toBeInTheDocument()
    return router
  }

  it('aceita: a sala é mantida e volta para a Preparação do zero [RN-POS-03]', async () => {
    const router = await toResult('aceita')
    fireEvent.click(screen.getByRole('button', { name: 'Revanche' }))
    await tick(NET)
    expect(screen.getByRole('button', { name: 'Revanche pedida' })).toBeDisabled()

    await tick(MOCK_TIMINGS.rematchAccept + NET)
    expect(screen.getByRole('heading', { name: 'Preparação' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sala/4821')
  })

  it('recusa: quem pediu é avisado e levado ao Hub [RN-POS-02]', async () => {
    const router = await toResult('recusa')
    fireEvent.click(screen.getByRole('button', { name: 'Revanche' }))
    await tick(NET + MOCK_TIMINGS.rematchAccept + NET)
    expect(router.state.location.pathname).toBe('/')
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain(
      'O oponente recusou a revanche.',
    )
  })

  it('o oponente sai: quem não pediu fica no Resultado com a revanche desabilitada', async () => {
    const router = await toResult('sai')
    await tick(MOCK_TIMINGS.botRematch + NET)
    expect(router.state.location.pathname).toBe('/sala/4821')
    expect(screen.getByText('O oponente saiu da sala.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revanche' })).toBeDisabled()
  })
})

describe('Arena', () => {
  it('jogada pelo tabuleiro: manda a intenção e só muda com a resposta do servidor', async () => {
    renderRoom('normal')
    await toPlaying()
    await waitForMyTurn()
    // Timer na faixa do jogador da vez (não na coluna direita)
    expect(screen.getByRole('progressbar', { name: 'Seu tempo' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { name: 'Tempo do turno' })).not.toBeInTheDocument()

    const before = emptyCells().length
    fireEvent.click(emptyCells()[0])
    expect(emptyCells()).toHaveLength(before) // ainda sem resposta

    await tick(NET)
    expect(screen.getByText(/Vez de .*/)).toBeInTheDocument()
    expect(emptyCells()).toHaveLength(0) // vez do oponente: nada clicável
    expect(within(board()).getAllByRole('img', { name: /vazia/ })).toHaveLength(before - 1)
    expect(screen.getByRole('progressbar', { name: 'Tempo do turno' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { name: 'Seu tempo' })).not.toBeInTheDocument()
  })

  it('faixas mostram os dois jogadores e o espaço do Vitão fica vazio com a flag desligada', async () => {
    renderRoom('normal')
    await toPlaying()
    // O banner do Confronto já saiu (só aparece na fase VERSUS)
    expect(screen.queryByText(/vs Oponente Simulado/)).not.toBeInTheDocument()
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
