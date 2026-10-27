import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { useToastStore } from '../../stores/toastStore'
import { PlayScreen } from './PlayScreen'

vi.mock('../../api/rooms', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/rooms')>()
  return { ...original, createRoom: vi.fn<typeof original.createRoom>() }
})

import { createRoom } from '../../api/rooms'

function renderPlay() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <PlayScreen /> },
      { path: '/sala/:codigo', element: <p>sala</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

afterEach(() => {
  vi.clearAllMocks()
  useToastStore.setState({ toasts: [] })
})

describe('PlayScreen', () => {
  it('Criar sala vai para a sala com o código do servidor', async () => {
    vi.mocked(createRoom).mockResolvedValueOnce({ code: '1234' })
    const router = renderPlay()
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/sala/1234'))
  })

  it('erro ao criar sala avisa e continua no Hub', async () => {
    vi.mocked(createRoom).mockRejectedValueOnce(new ApiError(500, 'Erro interno do servidor'))
    const router = renderPlay()
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }))

    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1))
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByRole('button', { name: 'Criar sala' })).toBeEnabled()
  })

  it('Entrar com código abre o modal do código', async () => {
    renderPlay()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar com código' }))
    expect(screen.getByRole('heading', { name: 'Código da sala' })).toBeInTheDocument()
  })

  it('Como jogar abre o modal da FE-34', async () => {
    renderPlay()
    await userEvent.click(screen.getByRole('button', { name: 'Como jogar' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Instalar app não aparece num navegador que não instala sites', () => {
    renderPlay()
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
  })
})
