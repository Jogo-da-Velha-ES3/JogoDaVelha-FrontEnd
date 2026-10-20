import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import { AccessScreen } from './AccessScreen'

vi.mock('../../api/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/auth')>()
  return {
    ...original,
    login: vi.fn<typeof original.login>(),
    register: vi.fn<typeof original.register>(),
  }
})

import { login, register } from '../../api/auth'  

const SESSION = { token: 'jwt', id: 'u1', username: 'vini', coinsBalance: 0 }

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ token: null })
})

afterEach(() => vi.clearAllMocks())

describe('Entrar', () => {
  it('mostra os erros na hora, sem chamar o servidor', async () => {
    render(<AccessScreen />)
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe seu e-mail ou nome de usuário.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('só guarda a sessão quando o servidor confirma', async () => {
    let resolve: (value: typeof SESSION) => void = () => {}
    vi.mocked(login).mockReturnValueOnce(new Promise((r) => (resolve = r)))
    render(<AccessScreen />)

    await userEvent.type(screen.getByLabelText('E-mail ou usuário'), 'vini')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo1')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
    expect(useAuthStore.getState().token).toBeNull()

    resolve(SESSION)
    await waitFor(() => expect(useAuthStore.getState().token).toBe('jwt'))
    expect(login).toHaveBeenCalledWith('vini', 'segredo1')
  })

  it('senha errada mostra mensagem e libera o botão', async () => {
    vi.mocked(login).mockRejectedValueOnce(new ApiError(401, 'x', 'INVALID_CREDENTIALS'))
    render(<AccessScreen />)

    await userEvent.type(screen.getByLabelText('E-mail ou usuário'), 'vini')
    await userEvent.type(screen.getByLabelText('Senha'), 'errada1')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail, usuário ou senha incorretos.',
    )
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    expect(useAuthStore.getState().token).toBeNull()
  })
})

describe('Criar conta', () => {
  async function openRegister() {
    render(<AccessScreen />)
    await userEvent.click(screen.getByRole('tab', { name: 'Criar conta' }))
  }

  it('valida tamanho do usuário, e-mail e senha antes de enviar', async () => {
    await openRegister()
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ab')
    await userEvent.type(screen.getByLabelText('E-mail'), 'vini@fatec')
    await userEvent.type(screen.getByLabelText('Senha'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText(/de 3 a 15 caracteres/)).toBeInTheDocument()
    expect(screen.getByText('E-mail inválido.')).toBeInTheDocument()
    expect(screen.getByText(/de 6 a 72 caracteres/)).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('e-mail já cadastrado aparece embaixo do campo de e-mail', async () => {
    vi.mocked(register).mockRejectedValueOnce(new ApiError(409, 'x', 'EMAIL_ALREADY_EXISTS'))
    await openRegister()
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'vini')
    await userEvent.type(screen.getByLabelText('E-mail'), 'vini@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo1')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    const message = await screen.findByText('Esse e-mail já tem uma conta. Tente entrar.')
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-describedby', message.id)
  })

  it('cadastro certo já entra na conta', async () => {
    vi.mocked(register).mockResolvedValueOnce(SESSION)
    await openRegister()
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'vini')
    await userEvent.type(screen.getByLabelText('E-mail'), 'vini@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo1')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => expect(useAuthStore.getState().token).toBe('jwt'))
    expect(register).toHaveBeenCalledWith('vini', 'vini@exemplo.com', 'segredo1')
  })
})
