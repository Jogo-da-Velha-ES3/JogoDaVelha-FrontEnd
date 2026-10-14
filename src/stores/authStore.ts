import { create } from 'zustand'
import { onUnauthorized } from '../api/client'
import { clearAuthToken, getAuthToken, setAuthToken } from '../api/session'

interface AuthState {
  /** Token do back; null = sem sessão */
  token: string | null
  login: (token: string) => void
  logout: () => void
}

// O token sobrevive entre os acessos ("manter conectado"); o usuário logado vem com a FE-25/FE-30
export const useAuthStore = create<AuthState>()((set) => ({
  token: getAuthToken(),
  login: (token) => {
    setAuthToken(token)
    set({ token })
  },
  logout: () => {
    clearAuthToken()
    set({ token: null })
  },
}))

// 401 numa rota autenticada: o cliente REST já apagou o token, aqui a interface fica sabendo
onUnauthorized(() => useAuthStore.setState({ token: null }))

export const selectIsAuthenticated = (state: AuthState) => state.token !== null
