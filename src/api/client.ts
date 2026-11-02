// Cliente REST fino: conta, perfil, loja, Coins e salas. Partida e sala em tempo real vão por STOMP.
import { APP_TEXTS } from '../constants/texts'
import { clearAuthToken, getAuthToken } from './session'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  /** Status HTTP; 0 quando nem chegou ao servidor */
  readonly status: number
  /** Código de erro enviado pelo back, quando houver */
  readonly code: string | null
  /** Erros por campo do VALIDATION_ERROR do back, ex: `{ email: 'E-mail inválido' }` */
  readonly fields: Record<string, string>

  constructor(
    status: number,
    message: string,
    code: string | null = null,
    fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
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
    throw new ApiError(0, APP_TEXTS.errors.network, 'NETWORK')
  }

  const data = parseJson(await response.text())

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearAuthToken()
      unauthorizedHandler?.()
    }
    const error = readBackError(data)
    throw new ApiError(
      response.status,
      error.message ?? APP_TEXTS.errors.httpStatus(response.status),
      error.code,
      error.fields,
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

/**
 * Lê `code` e `message` de um erro do back. [A VALIDAR COM O BACK] O combinado é
 * `{ code, message }`; hoje o auth manda `{ error }` e as salas, `{ "erro: " }`.
 */
function readBackError(data: unknown): {
  code: string | null
  message: string | null
  fields: Record<string, string>
} {
  // Corpo que não é JSON (ex: página HTML de um 502) nunca vira mensagem na tela
  if (!data || typeof data !== 'object') return { code: null, message: null, fields: {} }
  const record = data as Record<string, unknown>
  const text = (key: string) => (typeof record[key] === 'string' ? (record[key] as string) : null)
  return {
    code: text('code'),
    message: text('message') ?? text('error') ?? text('erro: '),
    fields: readFields(record.fields),
  }
}

/** Só aceita `{ campo: 'mensagem' }`; qualquer outro formato vira objeto vazio */
function readFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}
