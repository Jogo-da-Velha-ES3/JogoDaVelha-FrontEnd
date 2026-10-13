import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./session', () => ({
  getAuthToken: vi.fn<() => string | null>(() => 'token-123'),
  clearAuthToken: vi.fn<() => void>(),
}))

import { ApiError, apiRequest, onUnauthorized } from './client'
import { clearAuthToken, getAuthToken } from './session'

const fetchMock = vi.fn<typeof fetch>()

/** Init e headers da n-ésima chamada ao fetch. */
function call(n = 0) {
  const init = fetchMock.mock.calls[n][1] ?? {}
  return { init, headers: init.headers as Record<string, string> }
}

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  fetchMock.mockReset()
  onUnauthorized(null)
})

describe('apiRequest', () => {
  it('envia JSON e o token de login', async () => {
    respond(200, { ok: true })

    const data = await apiRequest<{ ok: boolean }>('/rooms', { method: 'POST', body: { a: 1 } })

    expect(data).toEqual({ ok: true })
    const { init, headers } = call()
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
    expect(headers.Authorization).toBe('Bearer token-123')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('não envia o token quando auth é false', async () => {
    respond(200, {})

    await apiRequest('/auth/login', { method: 'POST', body: {}, auth: false })

    expect(call().headers.Authorization).toBeUndefined()
    expect(getAuthToken).not.toHaveBeenCalled()
  })

  it('aceita resposta vazia (204)', async () => {
    respond(204)

    await expect(apiRequest('/me', { method: 'PATCH', body: {} })).resolves.toBeNull()
  })

  it('transforma erro do back em ApiError com mensagem e código', async () => {
    respond(404, { code: 'ROOM_NOT_FOUND', message: 'Sala 4821 não encontrada' })

    const error = await apiRequest('/rooms/4821/join', { method: 'POST' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 404,
      code: 'ROOM_NOT_FOUND',
      message: 'Sala 4821 não encontrada',
    })
  })

  it('limpa a sessão e avisa quando recebe 401', async () => {
    const handler = vi.fn<() => void>()
    onUnauthorized(handler)
    respond(401, { message: 'Token expirado' })

    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 401 })
    expect(clearAuthToken).toHaveBeenCalled()
    expect(handler).toHaveBeenCalled()
  })

  it('usa status 0 quando não alcança o servidor', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 0, code: 'NETWORK' })
  })
})
