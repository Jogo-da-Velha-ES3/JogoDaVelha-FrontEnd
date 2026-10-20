import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { JoinRoomModal } from './JoinRoomModal'

vi.mock('../../api/rooms', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/rooms')>()
  return { ...original, joinRoomByCode: vi.fn<typeof original.joinRoomByCode>() }
})

import { joinRoomByCode } from '../../api/rooms'

function renderModal(onClose = () => {}) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <JoinRoomModal open onClose={onClose} /> },
      { path: '/sala/:codigo', element: <p>sala</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const digit = (n: number) => screen.getByLabelText(`Dígito ${n}`)
const enter = () => screen.getByRole('button', { name: 'Entrar' })

afterEach(() => vi.clearAllMocks())

describe('JoinRoomModal', () => {
  it('ENTRAR só habilita com os 4 dígitos e letras são ignoradas', async () => {
    renderModal()
    await userEvent.type(digit(1), '4a8')
    expect(digit(1)).toHaveValue('4')
    expect(digit(2)).toHaveValue('8')
    expect(enter()).toBeDisabled()

    await userEvent.type(digit(3), '21')
    expect(enter()).toBeEnabled()
  })

  it('colar "4821" no primeiro campo preenche os 4', async () => {
    renderModal()
    await userEvent.click(digit(1))
    await userEvent.paste('4821')
    expect([1, 2, 3, 4].map((n) => (digit(n) as HTMLInputElement).value).join('')).toBe('4821')
    expect(enter()).toBeEnabled()
  })

  it('preenchimento automático do celular no primeiro campo preenche os 4', () => {
    renderModal()
    // O código do SMS chega pelo onChange, inteiro, sem evento de colar
    fireEvent.change(digit(1), { target: { value: '4821' } })
    expect([1, 2, 3, 4].map((n) => (digit(n) as HTMLInputElement).value).join('')).toBe('4821')
    expect(enter()).toBeEnabled()
  })

  it('digitar numa casa preenchida troca o dígito', async () => {
    renderModal()
    await userEvent.type(digit(1), '4')
    // Cursor depois do dígito, sem seleção: chega "47"
    fireEvent.change(digit(1), { target: { value: '47' } })
    expect(digit(1)).toHaveValue('7')
    expect(digit(2)).toHaveValue('')
  })

  it('Backspace numa casa vazia volta para a anterior', async () => {
    renderModal()
    await userEvent.type(digit(1), '48')
    await userEvent.keyboard('{Backspace}')
    expect(digit(1)).toHaveValue('4')
    expect(digit(2)).toHaveValue('')
  })

  it('só vai para a sala quando o servidor confirma', async () => {
    vi.mocked(joinRoomByCode).mockResolvedValueOnce({ code: '4821' })
    const router = renderModal()
    await userEvent.click(digit(1))
    await userEvent.paste('4821')
    await userEvent.click(enter())

    expect(joinRoomByCode).toHaveBeenCalledWith('4821')
    await waitFor(() => expect(router.state.location.pathname).toBe('/sala/4821'))
  })

  it('esperando o servidor, o modal não fecha', async () => {
    let resolve: (room: { code: string }) => void = () => {}
    vi.mocked(joinRoomByCode).mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const onClose = vi.fn<() => void>()
    const router = renderModal(onClose)
    await userEvent.click(digit(1))
    await userEvent.paste('4821')
    await userEvent.click(enter())

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()

    resolve({ code: '4821' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/sala/4821'))
  })

  it('erro da sala aparece em vermelho e mantém os campos', async () => {
    vi.mocked(joinRoomByCode).mockRejectedValueOnce(
      new ApiError(404, 'Sala 4821 não encontrada.', 'ROOM_NOT_FOUND'),
    )
    const router = renderModal()
    await userEvent.click(digit(1))
    await userEvent.paste('4821')
    await userEvent.click(enter())

    expect(await screen.findByRole('alert')).toHaveTextContent('Sala 4821 não encontrada.')
    expect(digit(4)).toHaveValue('1')
    expect(digit(1)).toHaveAttribute('aria-invalid', 'true')
    expect(router.state.location.pathname).toBe('/')
  })
})
