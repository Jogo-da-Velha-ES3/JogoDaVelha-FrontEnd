import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MATCH_FOUND_COUNTDOWN_SECONDS } from '../../constants/game'
import { resetGameStores } from '../../stores/serverEvents'
import { useRoomStore } from '../../stores/roomStore'
import { useToastStore } from '../../stores/toastStore'
import type { PlayerState } from '../../types/game'
import { WaitingRoom } from './WaitingRoom'

const writeText = vi.fn<(text: string) => Promise<void>>()

function player(slot: 'P1' | 'P2', nickname: string): PlayerState {
  return {
    slot,
    userId: slot,
    nickname,
    character: null,
    roundsWon: 0,
    consecutiveTimeouts: 0,
    forceFieldTurnsLeft: 0,
    silenced: false,
    connected: true,
  }
}

function renderRoom() {
  const router = createMemoryRouter(
    [
      { path: '/sala/:codigo', element: <WaitingRoom code="4821" /> },
      { path: '/', element: <p>hub</p> },
    ],
    { initialEntries: ['/sala/4821'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const lastToast = () => useToastStore.getState().toasts.at(-1)?.message

beforeEach(() => {
  resetGameStores()
  useRoomStore.setState({
    code: '4821',
    phase: 'WAITING',
    mySlot: 'P1',
    players: [player('P1', 'Rafa')],
  })
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText }, share: undefined })
  writeText.mockResolvedValue()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  writeText.mockReset()
  useToastStore.setState({ toasts: [] })
})

describe('Sala de Espera', () => {
  it('mostra a sala do host, o código e o aviso de espera', () => {
    renderRoom()
    expect(screen.getByRole('heading', { name: 'Sala de Rafa' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Código da sala: 4 8 2 1' })).toBeInTheDocument()
    expect(screen.getByText('Aguardando adversário…')).toBeInTheDocument()
    expect(screen.getByText('você · host')).toBeInTheDocument()
  })

  it('Copiar código copia os 4 dígitos', async () => {
    renderRoom()
    await userEvent.click(screen.getByRole('button', { name: 'Copiar código' }))
    expect(writeText).toHaveBeenCalledWith('4821')
    expect(lastToast()).toBe('Código copiado!')
  })

  it('no desktop, Copiar link copia o link direto da sala', async () => {
    renderRoom()
    await userEvent.click(screen.getByRole('button', { name: 'Copiar link' }))
    expect(writeText.mock.calls[0][0]).toMatch(/\/sala\/4821$/)
    expect(lastToast()).toBe('Link copiado!')
  })

  it('se o navegador não deixa copiar, avisa e mostra o código', async () => {
    writeText.mockRejectedValueOnce(new Error('sem permissão'))
    renderRoom()
    await userEvent.click(screen.getByRole('button', { name: 'Copiar código' }))
    expect(lastToast()).toBe('Não deu para copiar. O código é 4821.')
  })

  it('Sair da sala volta para o Hub', async () => {
    const router = renderRoom()
    await userEvent.click(screen.getByRole('button', { name: '← Sair da sala' }))
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('Match feito', () => {
  it('mostra o nome do oponente e conta 3 → 0 sem mudar de tela sozinho', () => {
    vi.useFakeTimers()
    renderRoom()
    act(() =>
      useRoomStore.setState({
        phase: 'MATCHED',
        players: [player('P1', 'Rafa'), player('P2', 'Dany')],
      }),
    )

    expect(screen.getByRole('heading', { name: 'Match feito!' })).toBeInTheDocument()
    expect(screen.getByText('Dany entrou!')).toBeInTheDocument()
    expect(screen.getByText(/Preparação em/)).toHaveTextContent(
      `Preparação em ${MATCH_FOUND_COUNTDOWN_SECONDS}…`,
    )

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText(/Preparação em/)).toHaveTextContent(
      `Preparação em ${MATCH_FOUND_COUNTDOWN_SECONDS - 1}…`,
    )

    // A contagem acaba, mas quem muda para a Preparação é o servidor
    act(() => vi.advanceTimersByTime(MATCH_FOUND_COUNTDOWN_SECONDS * 1000))
    expect(screen.getByText('Preparando…')).toBeInTheDocument()
    expect(useRoomStore.getState().phase).toBe('MATCHED')
  })

  it('quem entrou (P2) vê o host como oponente', () => {
    useRoomStore.setState({
      phase: 'MATCHED',
      mySlot: 'P2',
      players: [player('P1', 'Rafa'), player('P2', 'Dany')],
    })
    renderRoom()
    expect(screen.getByText('Rafa entrou!')).toBeInTheDocument()
    expect(screen.getByText('você')).toBeInTheDocument()
    expect(screen.getByText('host')).toBeInTheDocument()
  })
})
