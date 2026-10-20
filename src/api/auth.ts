// Cadastro e login pelo REST do back (FE-25). Rotas: POST /api/auth/register e /api/auth/login.
// O prefixo /api já vem no VITE_API_URL.
import type { FieldErrors, LoginField, RegisterField } from '../lib/authValidation'
import { isMockServerEnabled } from '../sockets/mode'
import { ApiError, apiRequest } from './client'

/** O que o back devolve no login (LoginResponse) */
export interface AuthSession {
  token: string
  id: string
  username: string
  coinsBalance: number
}

interface RegisterResponse {
  id: string
  username: string
  email: string
}

/** Login por e-mail ou nome de usuário: o back decide qual é pelo `identifier`. */
export async function login(identifier: string, password: string): Promise<AuthSession> {
  if (isMockServerEnabled()) return mockSession(identifier.trim())
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: { identifier: identifier.trim(), password },
    auth: false,
  })
}

/**
 * Cria a conta e já entra nela. O cadastro do back responde 201 sem token, então o login vem
 * logo em seguida, com o nome de usuário recém-criado.
 */
export async function register(
  username: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  if (isMockServerEnabled()) return mockSession(username.trim())
  const created = await apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: { username: username.trim(), email: email.trim(), password },
    auth: false,
  })
  return login(created.username, password)
}

// Simulado (sem back): a Vercel continua navegável, como o createRoom() faz
function mockSession(name: string): AuthSession {
  return {
    token: `token-simulado-${Date.now()}`,
    id: 'simulado',
    username: name.includes('@') ? name.split('@')[0] : name,
    coinsBalance: 0,
  }
}

/** Erro pronto para a tela: mensagens por campo e/ou uma mensagem geral do formulário */
export interface AuthFormError<F extends string> {
  fields: FieldErrors<F>
  form: string | null
}

const GENERIC = 'Não foi possível concluir agora. Tente de novo em instantes.'

/** Traduz o erro do back para a tela de Entrar */
export function loginErrorFor(error: unknown): AuthFormError<LoginField> {
  if (!(error instanceof ApiError)) return { fields: {}, form: GENERIC }
  // Mensagem única e neutra: não revela se o usuário existe
  if (error.code === 'INVALID_CREDENTIALS' || error.status === 401) {
    return { fields: {}, form: 'E-mail, usuário ou senha incorretos.' }
  }
  if (error.code === 'VALIDATION_ERROR') {
    return { fields: pick(error.fields, ['identifier', 'password']), form: null }
  }
  return { fields: {}, form: messageFor(error) }
}

/** Traduz o erro do back para a tela de Criar conta */
export function registerErrorFor(error: unknown): AuthFormError<RegisterField> {
  if (!(error instanceof ApiError)) return { fields: {}, form: GENERIC }
  if (error.code === 'USERNAME_ALREADY_EXISTS') {
    return { fields: { username: 'Esse nome de usuário já está em uso.' }, form: null }
  }
  if (error.code === 'EMAIL_ALREADY_EXISTS') {
    return { fields: { email: 'Esse e-mail já tem uma conta. Tente entrar.' }, form: null }
  }
  if (error.code === 'VALIDATION_ERROR') {
    return { fields: pick(error.fields, ['username', 'email', 'password']), form: null }
  }
  return { fields: {}, form: messageFor(error) }
}

function messageFor(error: ApiError): string {
  if (error.code === 'NETWORK') return error.message
  return error.status >= 500 || error.status === 0 ? GENERIC : error.message || GENERIC
}

function pick<F extends string>(fields: Record<string, string>, keys: F[]): FieldErrors<F> {
  const result: FieldErrors<F> = {}
  for (const key of keys) if (fields[key]) result[key] = fields[key]
  return result
}
