import { beforeEach, describe, expect, it } from 'vitest'
import { getAuthToken } from '../api/session'
import { selectIsAuthenticated, useAuthStore } from './authStore'

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ token: null })
})

describe('authStore', () => {
  it('login guarda o token para os próximos acessos ("manter conectado")', () => {
    useAuthStore.getState().login('abc')
    expect(selectIsAuthenticated(useAuthStore.getState())).toBe(true)
    expect(getAuthToken()).toBe('abc')
  })

  it('logout apaga o token', () => {
    useAuthStore.getState().login('abc')
    useAuthStore.getState().logout()
    expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false)
    expect(getAuthToken()).toBeNull()
  })
})
