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

/** A conta foi criada, mas o login logo depois falhou (ex: a rede caiu): falta só entrar */
export class AccountCreatedError extends Error {
  readonly username: string

  constructor(username: string) {
    super('Conta criada, mas não foi possível entrar nela.')
    this.name = 'AccountCreatedError'
    this.username = username
  }
}

/**
 * Cria a conta e já entra nela. O cadastro do back responde 201 sem token, então o login vem
 * logo em seguida, com o nome de usuário recém-criado. Se só o login falhar, lança
 * `AccountCreatedError`: tentar o cadastro de novo daria "nome de usuário já está em uso".
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
  try {
    return await login(created.username, password)
  } catch {
    throw new AccountCreatedError(created.username)
  }
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
const INVALID_DATA = 'Confira os dados e tente de novo.'

/** Traduz o erro do back para a tela de Entrar */
export function loginErrorFor(error: unknown): AuthFormError<LoginField> {
  if (!(error instanceof ApiError)) return { fields: {}, form: GENERIC }
  // Mensagem única e neutra: não revela se o usuário existe
  if (error.code === 'INVALID_CREDENTIALS' || error.status === 401) {
    return { fields: {}, form: 'E-mail, usuário ou senha incorretos.' }
  }
  if (error.code === 'VALIDATION_ERROR') {
    return validationError(error, ['identifier', 'password'])
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
    return validationError(error, ['username', 'email', 'password'])
  }
  return { fields: {}, form: messageFor(error) }
}

// Sem nenhum campo daquele formulário (ex: o back manda o VALIDATION_ERROR sem `fields`), a
// mensagem vai para o formulário: o jogador nunca fica sem resposta
function validationError<F extends string>(error: ApiError, keys: F[]): AuthFormError<F> {
  const fields = pick(error.fields, keys)
  return { fields, form: Object.keys(fields).length > 0 ? null : INVALID_DATA }
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

// ---- Recuperação de senha (FE-36) -------------------------------------------------------------
// PROPOSTA, A VALIDAR COM O BACK: no repositório do back isto é só o card BE-006.1 (reserva);
// os endpoints ainda não existem. Rotas: POST /api/auth/forgot-password e /api/auth/reset-password,
// as duas públicas (sem token de login).

/** A COMBINAR COM O BACK: código do erro "link inválido, expirado ou já usado" do reset-password */
export const INVALID_RESET_TOKEN_CODE = 'INVALID_RESET_TOKEN'

/**
 * Só no simulado: este token devolve "link inválido ou expirado" (abra
 * `/redefinir-senha?token=expirado`). Token ausente ou vazio também falha; qualquer outro funciona.
 */
export const MOCK_EXPIRED_RESET_TOKEN = 'expirado'

/** Espera do simulado, para a tela mostrar o estado "enviando" como com o back de verdade */
const MOCK_DELAY_MS = 1000

/** Link sem token, inválido, expirado ou já usado: a tela "Nova senha" mostra este texto */
export const INVALID_RESET_LINK_MESSAGE = 'Esse link expirou ou não é válido. Peça um novo.'
const RESET_GENERIC = 'Não foi possível redefinir a senha agora. Tente novamente mais tarde.'
const FORGOT_GENERIC = 'Não foi possível enviar o pedido agora. Tente novamente mais tarde.'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Pede o link de recuperação por e-mail. O back descreve resposta 200 com mensagem genérica (o
 * combinado verbal era 204): os dois valem como sucesso, e o texto da resposta é ignorado. Quem
 * mostra a mensagem ao jogador é a tela, sempre a mesma, exista o e-mail ou não. No simulado, só
 * espera e resolve.
 */
export async function forgotPassword(email: string): Promise<void> {
  if (isMockServerEnabled()) return wait(MOCK_DELAY_MS)
  await apiRequest<unknown>('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
    auth: false,
  })
}

/**
 * Troca a senha com o token do link. A confirmação já foi conferida pela tela, então
 * `confirmPassword` vai igual à senha. No simulado, falha com "link inválido" se o token for
 * vazio ou `MOCK_EXPIRED_RESET_TOKEN`; qualquer outro token tem sucesso.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  if (isMockServerEnabled()) {
    await wait(MOCK_DELAY_MS)
    if (!token.trim() || token === MOCK_EXPIRED_RESET_TOKEN) {
      throw new ApiError(400, INVALID_RESET_LINK_MESSAGE, INVALID_RESET_TOKEN_CODE)
    }
    return
  }
  await apiRequest<unknown>('/auth/reset-password', {
    method: 'POST',
    // A COMBINAR COM O BACK: formato do card BE-006.1. Se virar `{ token, password }`, é só
    // trocar este corpo.
    body: { token, newPassword: password, confirmPassword: password },
    auth: false,
  })
}

/**
 * Erro do reset pronto para a tela. `invalidLink` troca o formulário pela mensagem de link
 * inválido (o `form` já vem com ela); senão, `fields.password` ou `form` explicam o que houve.
 */
export interface ResetPasswordFormError extends AuthFormError<'password'> {
  invalidLink: boolean
}

// Códigos genéricos do back: dizem "pedido ruim" ou "rota não achada", nunca "token ruim"
const GENERIC_ERROR_CODES = ['VALIDATION_ERROR', 'NOT_FOUND', 'BAD_REQUEST', 'INVALID_REQUEST_BODY']

/**
 * Traduz o erro do reset-password: link inválido, erro de senha por campo ou erro genérico.
 * Como o front já confere tamanho e igualdade das senhas e a existência do token antes de
 * enviar, um 400/410 sem erro de campo é tratado como token inválido, expirado ou já usado.
 * O 404 fica de fora de propósito: sem os endpoints no back, a rota responde 404, e isso é
 * erro genérico, não "link inválido".
 */
export function resetPasswordErrorFor(error: unknown): ResetPasswordFormError {
  if (!(error instanceof ApiError)) return resetError(RESET_GENERIC)

  if (error.code === 'VALIDATION_ERROR') {
    // O back pode nomear o campo pelo corpo novo (`newPassword`) ou pelo nome comum (`password`)
    const message = error.fields.newPassword || error.fields.password
    return message
      ? { fields: { password: message }, form: null, invalidLink: false }
      : resetError(INVALID_DATA)
  }

  const isLinkStatus = error.status === 400 || error.status === 410
  const isGenericCode = error.code !== null && GENERIC_ERROR_CODES.includes(error.code)
  if (error.code === INVALID_RESET_TOKEN_CODE || (isLinkStatus && !isGenericCode)) {
    return { fields: {}, form: INVALID_RESET_LINK_MESSAGE, invalidLink: true }
  }

  return resetError(error.code === 'NETWORK' ? error.message : RESET_GENERIC)
}

function resetError(form: string): ResetPasswordFormError {
  return { fields: {}, form, invalidLink: false }
}

/**
 * Traduz o erro do forgot-password. Nunca repete a mensagem do servidor nem diz se o e-mail
 * existe: só a falha de rede ou o aviso genérico (a tela já validou o e-mail antes de enviar).
 */
export function forgotPasswordErrorFor(error: unknown): AuthFormError<'email'> {
  if (error instanceof ApiError && error.code === 'NETWORK') {
    return { fields: {}, form: error.message }
  }
  return { fields: {}, form: FORGOT_GENERIC }
}
