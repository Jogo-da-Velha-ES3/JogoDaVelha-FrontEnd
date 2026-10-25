import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INVALID_RESET_LINK_MESSAGE, MOCK_EXPIRED_RESET_TOKEN } from '../api/auth'
import { PASSWORD_CHANGED_MESSAGE } from '../features/auth/ResetPasswordScreen'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { routes } from './routes'

// Chama a função de verdade (o simulado, com ~1s de espera), só para saber se o back foi chamado
vi.mock('../api/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/auth')>()
  return {
    ...original,
    resetPassword: vi.fn<typeof original.resetPassword>(original.resetPassword),
  }
})

import { resetPassword } from '../api/auth'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

async function fillAndSend(password: string, confirm: string) {
  await userEvent.type(screen.getByLabelText('Nova senha'), password)
  await userEvent.type(screen.getByLabelText('Confirmar nova senha'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ token: null })
  useToastStore.setState({ toasts: [] })
})

afterEach(() => vi.clearAllMocks())

describe('Nova senha', () => {
  it('senhas diferentes bloqueiam o envio, sem chamar o back', async () => {
    renderAt('/redefinir-senha?token=teste')
    await fillAndSend('segredo1', 'segredo2')

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('sem token ou com o token expirado, mostra link inválido com a saída para o Acesso', async () => {
    const withoutToken = renderAt('/redefinir-senha')
    expect(screen.getByRole('alert')).toHaveTextContent(INVALID_RESET_LINK_MESSAGE)
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao Acesso' }))
    expect(withoutToken.state.location.pathname).toBe('/entrar')
    cleanup()

    renderAt(`/redefinir-senha?token=${MOCK_EXPIRED_RESET_TOKEN}`)
    await fillAndSend('segredo1', 'segredo1')
    // O simulado responde "link inválido" depois de ~1s e o formulário dá lugar à mensagem
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(
      INVALID_RESET_LINK_MESSAGE,
    )
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar ao Acesso' })).toBeInTheDocument()
  })

  it('trocou a senha: volta ao Acesso com o toast, e o token já saiu do endereço', async () => {
    const router = renderAt('/redefinir-senha?token=teste')
    expect(router.state.location.search).toBe('')

    await fillAndSend('segredo1', 'segredo1')
    expect(resetPassword).toHaveBeenCalledWith('teste', 'segredo1')
    // Nada otimista: enquanto o back não responde, continua na tela, sem toast
    expect(router.state.location.pathname).toBe('/redefinir-senha')
    expect(useToastStore.getState().toasts).toEqual([])

    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'), { timeout: 3000 })
    expect(await screen.findByRole('tab', { name: 'Entrar' })).toBeInTheDocument()
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toEqual([
      PASSWORD_CHANGED_MESSAGE,
    ])
  })

  it('quem abriu o link logado sai da sessão e cai no Acesso, não no Hub', async () => {
    useAuthStore.getState().login('token-teste')
    const router = renderAt('/redefinir-senha?token=teste')
    await fillAndSend('segredo1', 'segredo1')

    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'), { timeout: 3000 })
    expect(useAuthStore.getState().token).toBeNull()
    expect(await screen.findByRole('tab', { name: 'Entrar' })).toBeInTheDocument()
  })
})
