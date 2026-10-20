import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useRoomStore } from '../stores/roomStore'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const pathname = (router: ReturnType<typeof renderAt>) => router.state.location.pathname

function loggedIn() {
  useAuthStore.getState().login('token-teste')
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.setState({ token: null })
  useRoomStore.setState({ pendingRoomCode: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rotas com sessão', () => {
  it.each([
    ['/', 'Jogo do Velho'],
    ['/loja', 'Loja'],
    ['/perfil', 'Perfil'],
    ['/sala/4821', 'Sala 4821'],
  ])('%s abre "%s"', (path, title) => {
    loggedIn()
    const router = renderAt(path)
    expect(pathname(router)).toBe(path)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  })

  it('o Hub tem as abas Loja, Jogar e Perfil, com Jogar ativa no início', () => {
    loggedIn()
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Hub' })
    expect(nav).toHaveTextContent(/Loja.*Jogar.*Perfil/)
    expect(screen.getByRole('link', { name: 'Jogar' })).toHaveAttribute('aria-current', 'page')
  })

  it('/entrar logado vai para o Hub', () => {
    loggedIn()
    const router = renderAt('/entrar')
    expect(pathname(router)).toBe('/')
  })

  it('Sair encerra a sessão e volta para o Acesso', async () => {
    loggedIn()
    const router = renderAt('/perfil')
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    // Confirmação antes de sair: cancelar mantém a sessão
    expect(screen.getByRole('heading', { name: 'Quer mesmo sair?' })).toBeInTheDocument()
    expect(useAuthStore.getState().token).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }))
    expect(pathname(router)).toBe('/entrar')
    expect(useAuthStore.getState().token).toBeNull()
  })
})

describe('guarda de sessão', () => {
  it.each(['/', '/loja', '/perfil'])('%s sem sessão vai para /entrar', (path) => {
    const router = renderAt(path)
    expect(pathname(router)).toBe('/entrar')
    expect(screen.getByRole('tab', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('link /sala/4821 sem sessão passa pelo Acesso e volta para a sala', async () => {
    const router = renderAt('/sala/4821')
    expect(pathname(router)).toBe('/entrar')
    expect(useRoomStore.getState().pendingRoomCode).toBe('4821')
    expect(sessionStorage.getItem('jdv.pendingRoom')).toContain('4821')

    // Servidor simulado ligado nos testes: o login devolve um token falso
    await userEvent.type(screen.getByLabelText('E-mail ou usuário'), 'vini')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo1')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(pathname(router)).toBe('/sala/4821'))
    expect(screen.getByRole('heading', { name: 'Sala 4821' })).toBeInTheDocument()
    expect(useRoomStore.getState().pendingRoomCode).toBeNull()
  })

  it('/redefinir-senha abre sem sessão (link do e-mail)', () => {
    const router = renderAt('/redefinir-senha?token=abc')
    expect(pathname(router)).toBe('/redefinir-senha')
    expect(screen.getByRole('heading', { name: 'Nova senha' })).toBeInTheDocument()
  })

  it('401 da API derruba a sessão e guarda a sala para voltar depois do login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: 401 })),
    )
    loggedIn()
    const router = renderAt('/sala/4821')

    await act(() => apiRequest('/me').catch(() => {}))

    await waitFor(() => expect(pathname(router)).toBe('/entrar'))
    expect(useRoomStore.getState().pendingRoomCode).toBe('4821')
  })
})

describe('rotas inexistentes', () => {
  it.each([false, true])(
    'endereço desconhecido mostra "Página não encontrada" (logado: %s)',
    (logged) => {
      if (logged) loggedIn()
      renderAt('/nao-existe')
      expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    },
  )

  it.each(['/sala/abc', '/sala/12345', '/sala/482'])(
    '%s logado é página não encontrada',
    (path) => {
      loggedIn()
      renderAt(path)
      expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    },
  )

  it('código inválido sem sessão não fica guardado', () => {
    const router = renderAt('/sala/abc')
    expect(pathname(router)).toBe('/entrar')
    expect(useRoomStore.getState().pendingRoomCode).toBeNull()
  })

  it('"Voltar ao Hub" leva para /', async () => {
    loggedIn()
    const router = renderAt('/nao-existe')
    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao Hub' }))
    expect(pathname(router)).toBe('/')
  })
})
