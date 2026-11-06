import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../api/client'
import { getAuthToken } from '../api/session'
import { ACCESS_TEXTS } from '../constants/texts'
import { selectIsAuthenticated, useAuthStore } from './authStore'
import { useToastStore } from './toastStore'

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ token: null })
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const toastMessages = () => useToastStore.getState().toasts.map((toast) => toast.message)

describe('authStore', () => {
  it('login guarda o token para os próximos acessos ("manter conectado")', () => {
    useAuthStore.getState().login('abc')
    expect(selectIsAuthenticated(useAuthStore.getState())).toBe(true)
    expect(getAuthToken()).toBe('abc')
  })

  it('logout apaga o token, sem o aviso de sessão expirada', () => {
    useAuthStore.getState().login('abc')
    useAuthStore.getState().logout()
    expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false)
    expect(getAuthToken()).toBeNull()
    expect(toastMessages()).toEqual([])
  })

  it('token vencido (401): sai da conta e avisa uma vez só, mesmo com várias chamadas juntas', async () => {
    // Resposta real do back (JwtAuthenticationEntryPoint)
    const unauthorized = {
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária ou token inválido',
      status: 401,
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(unauthorized), { status: 401 }))),
    )
    useAuthStore.getState().login('vencido')

    // A carga do Hub: perfil, estatísticas e os dois catálogos ao mesmo tempo
    await Promise.allSettled(
      ['/profile', '/profile/stats', '/shop/characters', '/shop/skills'].map((path) =>
        apiRequest(path),
      ),
    )

    expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false)
    expect(getAuthToken()).toBeNull()
    expect(toastMessages()).toEqual([ACCESS_TEXTS.sessionExpired])
  })
})
