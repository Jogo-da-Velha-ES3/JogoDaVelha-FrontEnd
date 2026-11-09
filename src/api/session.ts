// Guarda o token de login entre os acessos ("manter conectado").
const TOKEN_KEY = 'jdv.authToken'

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Sem armazenamento disponível (ex: navegação privada): a sessão dura só esta aba.
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nada a limpar.
  }
}
