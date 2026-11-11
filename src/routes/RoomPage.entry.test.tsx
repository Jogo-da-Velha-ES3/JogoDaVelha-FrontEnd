// Entrada na sala: pelo link, o POST /join vem antes do STOMP, porque o back só deixa assinar a
// sala depois dele. Criar Sala e o modal do código já fizeram o /join e pulam esse passo.
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { useToastStore } from '../stores/toastStore'
import { JOINED_ROOM_STATE, type RoomLocationState } from './paths'
import { RoomPage } from './RoomPage'

vi.mock('../api/rooms', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/rooms')>()
  return { ...original, enterRoomByLink: vi.fn<typeof original.enterRoomByLink>() }
})

vi.mock('../sockets/gameClient', async (importOriginal) => {
  const original = await importOriginal<typeof import('../sockets/gameClient')>()
  return {
    ...original,
    joinRoom: vi.fn<typeof original.joinRoom>(),
    leaveRoom: vi.fn<typeof original.leaveRoom>(),
  }
})

import { enterRoomByLink } from '../api/rooms'
import { joinRoom } from '../sockets/gameClient'

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
