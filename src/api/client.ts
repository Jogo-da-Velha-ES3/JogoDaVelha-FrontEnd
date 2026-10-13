// Cliente REST fino: conta, perfil, loja, Coins e salas. Partida e sala em tempo real vão por STOMP.
import { clearAuthToken, getAuthToken } from './session'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  /** Status HTTP; 0 quando nem chegou ao servidor */
  readonly status: number
  /** Código de erro enviado pelo back, quando houver */
  readonly code: string | null

  constructor(status: number, message: string, code: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  /** Envia o token de login. Padrão: true */
  auth?: boolean
  signal?: AbortSignal
}

let unauthorizedHandler: (() => void) | null = null

/** Chamado quando o back responde 401 numa rota autenticada (ex: token expirado). */
export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      0,
      'Não foi possível falar com o servidor. Verifique sua conexão.',
      'NETWORK',
    )
  }

  const data = parseJson(await response.text())

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearAuthToken()
      unauthorizedHandler?.()
    }
    throw new ApiError(
      response.status,
      readString(data, 'message') ?? `Erro ${response.status} ao falar com o servidor.`,
      readString(data, 'code'),
    )
  }

  return data as T
}

function parseJson(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function readString(data: unknown, key: string): string | null {
  if (data && typeof data === 'object' && key in data) {
    const value = (data as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : null
  }
  return null
}
