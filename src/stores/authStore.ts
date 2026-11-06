import { create } from 'zustand'
import { onUnauthorized } from '../api/client'
import { clearAuthToken, getAuthToken, setAuthToken } from '../api/session'
import { ACCESS_TEXTS } from '../constants/texts'
import { showToast } from './toastStore'

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

// 401 numa rota autenticada (token vencido ou inválido): o cliente REST já apagou o token, aqui a
// interface fica sabendo e o `RequireAuth` leva ao Acesso. O aviso sai uma vez só, porque várias
// chamadas podem voltar com 401 juntas (a carga do Hub faz 4)
onUnauthorized(() => {
  if (useAuthStore.getState().token === null) return
  useAuthStore.setState({ token: null })
  showToast({ message: ACCESS_TEXTS.sessionExpired })
})

export const selectIsAuthenticated = (state: AuthState) => state.token !== null
