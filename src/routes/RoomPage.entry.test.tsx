// Entrada na sala: pelo link, o POST /join vem antes do STOMP, porque o back só deixa assinar a
// sala depois dele. Criar Sala e o modal do código já fizeram o /join e pulam esse passo.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { useToastStore } from '../stores/toastStore'
import { JOINED_ROOM_STATE, type RoomLocationState } from './paths'
import { RoomPage } from './RoomPage'

vi.mock('../api/rooms', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/rooms')>()
  return {
    ...original,
    enterRoomByLink: vi.fn<typeof original.enterRoomByLink>(),
    checkActiveRoom: vi.fn<typeof original.checkActiveRoom>(async () => ({ status: 'NONE' })),
  }
})

vi.mock('../sockets/gameClient', async (importOriginal) => {
  const original = await importOriginal<typeof import('../sockets/gameClient')>()
  return {
    ...original,
    joinRoom: vi.fn<typeof original.joinRoom>(),
    leaveRoom: vi.fn<typeof original.leaveRoom>(),
  }
})

import { ActiveRoomError, checkActiveRoom, enterRoomByLink } from '../api/rooms'
import { joinRoom, leaveRoom } from '../sockets/gameClient'
import { useActiveRoomStore } from '../stores/activeRoomStore'
import { useRoomStore } from '../stores/roomStore'

function renderRoom(state?: RoomLocationState) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Hub</p> },
      { path: '/sala/:codigo', element: <RoomPage /> },
    ],
    { initialEntries: [{ pathname: '/sala/4821', state }] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const toasts = () => useToastStore.getState().toasts

afterEach(() => {
  vi.clearAllMocks()
  useToastStore.setState({ toasts: [] })
  useActiveRoomStore.setState({ room: null })
  useRoomStore.setState({ lastError: null })
})

describe('entrar na sala pelo link', () => {
  it('faz o POST /join e só então conecta no STOMP [RF-HUB-05]', async () => {
    vi.mocked(enterRoomByLink).mockResolvedValueOnce()
    vi.mocked(joinRoom).mockResolvedValueOnce()
    renderRoom()

    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith('4821'))
    expect(enterRoomByLink).toHaveBeenCalledWith('4821')
    expect(vi.mocked(enterRoomByLink).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(joinRoom).mock.invocationCallOrder[0],
    )
  })

  it('sala cheia: avisa em vermelho, volta ao Hub e não conecta no STOMP', async () => {
    vi.mocked(enterRoomByLink).mockRejectedValueOnce(
      new ApiError(409, 'A sala 4821 já está cheia.', 'ROOM_FULL'),
    )
    const router = renderRoom()

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(toasts()).toMatchObject([{ message: 'A sala 4821 já está cheia.', tone: 'danger' }])
    expect(screen.getByText('Hub')).toBeInTheDocument()
    expect(joinRoom).not.toHaveBeenCalled()
  })

  it('ainda preso noutra sala: avisa, volta ao Hub com o aviso dela e não conecta (AMB-01)', async () => {
    const other = { code: '1234', phase: 'PLAYING', canReturn: true } as const
    vi.mocked(enterRoomByLink).mockRejectedValueOnce(new ActiveRoomError(other))
    const router = renderRoom()

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(toasts()).toMatchObject([{ message: 'Você ainda está na sala 1234.' }])
    expect(useActiveRoomStore.getState().room).toEqual(other)
    expect(joinRoom).not.toHaveBeenCalled()
  })

  it('sessão vencida (401): não avisa nada, o Acesso já avisa', async () => {
    vi.mocked(enterRoomByLink).mockRejectedValueOnce(
      new ApiError(401, 'Token inválido', 'UNAUTHORIZED'),
    )
    const router = renderRoom()

    await waitFor(() => expect(enterRoomByLink).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20)) // deixa o erro ser tratado
    expect(toasts()).toHaveLength(0)
    expect(router.state.location.pathname).toBe('/sala/4821')
    expect(joinRoom).not.toHaveBeenCalled()
  })
})

describe('entrar na sala depois de Criar Sala ou do código', () => {
  it('não chama o POST /join de novo e conecta direto no STOMP', async () => {
    vi.mocked(joinRoom).mockResolvedValueOnce()
    renderRoom(JOINED_ROOM_STATE)

    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith('4821'))
    expect(enterRoomByLink).not.toHaveBeenCalled()
  })
})

describe('esperando o servidor (tela de entrada)', () => {
  it('mostra "Entrando na sala…" e deixa voltar ao Hub', async () => {
    vi.mocked(joinRoom).mockReturnValueOnce(new Promise(() => {})) // o servidor não responde
    const router = renderRoom(JOINED_ROOM_STATE)

    expect(screen.getByRole('heading', { name: 'Sala 4821' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Entrando na sala…')
    expect(screen.queryByText(/Em construção/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao Hub' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('conexão falha: o erro fica na tela, a conexão para e "Tentar de novo" refaz a entrada', async () => {
    vi.mocked(joinRoom)
      .mockRejectedValueOnce(new Error('O servidor recusou a conexão.'))
      .mockReturnValueOnce(new Promise(() => {}))
    renderRoom(JOINED_ROOM_STATE)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível entrar na sala agora.',
    )
    expect(leaveRoom).toHaveBeenCalled() // o stompjs não fica tentando sozinho
    expect(toasts()).toHaveLength(0) // o erro está na tela, sem aviso que some

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(joinRoom).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Entrando na sala…')
  })
})

describe('o servidor recusa a sala depois de conectar (AMB-01)', () => {
  // O back não deixa assinar uma sala da qual o jogador não faz mais parte: a conexão manda este
  // erro local a cada tentativa
  const refuse = () =>
    useRoomStore.setState({
      lastError: {
        code: 'CONNECTION_ERROR',
        message: 'O servidor recusou a conexão.',
        serverTime: Date.now(),
      },
    })

  it('a sala foi encerrada enquanto você estava fora: avisa e volta ao Hub', async () => {
    vi.mocked(joinRoom).mockResolvedValueOnce()
    vi.mocked(checkActiveRoom).mockResolvedValueOnce({ status: 'NONE' })
    const router = renderRoom(JOINED_ROOM_STATE)
    await waitFor(() => expect(joinRoom).toHaveBeenCalled())
    refuse()

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(toasts()).toContainEqual(
      expect.objectContaining({ message: 'A sala foi encerrada.', tone: 'info' }),
    )
  })

  it('preso noutra sala: volta ao Hub com o aviso dela', async () => {
    const other = { code: '1234', phase: 'RESULT', canReturn: true } as const
    vi.mocked(joinRoom).mockResolvedValueOnce()
    vi.mocked(checkActiveRoom).mockResolvedValueOnce({ status: 'FOUND', room: other })
    const router = renderRoom(JOINED_ROOM_STATE)
    await waitFor(() => expect(joinRoom).toHaveBeenCalled())
    refuse()

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(useActiveRoomStore.getState().room).toEqual(other)
  })

  it.each([
    [
      'a sala ainda é sua',
      { status: 'FOUND', room: { code: '4821', phase: 'PLAYING', canReturn: true } },
    ],
    ['sem resposta', { status: 'UNKNOWN' }],
  ] as const)('%s: continua na sala, e a conexão segue tentando', async (_, check) => {
    vi.mocked(joinRoom).mockResolvedValueOnce()
    vi.mocked(checkActiveRoom).mockResolvedValueOnce(check)
    const router = renderRoom(JOINED_ROOM_STATE)
    await waitFor(() => expect(joinRoom).toHaveBeenCalled())
    refuse()

    await waitFor(() => expect(checkActiveRoom).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20)) // deixa a resposta ser tratada
    expect(router.state.location.pathname).toBe('/sala/4821')
    expect(leaveRoom).not.toHaveBeenCalled()
  })
})
