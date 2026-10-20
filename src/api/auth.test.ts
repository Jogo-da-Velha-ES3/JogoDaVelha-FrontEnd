import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login, loginErrorFor, register, registerErrorFor } from './auth'
import { ApiError } from './client'

const fetchMock = vi.fn<typeof fetch>()

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
}

const bodyOf = (n: number) => JSON.parse(String(fetchMock.mock.calls[n][1]?.body))
const urlOf = (n: number) => String(fetchMock.mock.calls[n][0])

const SESSION = { token: 'jwt', id: 'u1', username: 'vini', coinsBalance: 0 }

describe('com o back de verdade', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('login manda identifier e senha, sem token', async () => {
    respond(200, SESSION)

    await expect(login('  vini@exemplo.com ', 'segredo1')).resolves.toEqual(SESSION)

    expect(urlOf(0)).toMatch(/\/auth\/login$/)
    expect(bodyOf(0)).toEqual({ identifier: 'vini@exemplo.com', password: 'segredo1' })
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('cadastro chama o register e depois o login (o register não devolve token)', async () => {
    respond(201, { id: 'u1', username: 'vini', email: 'vini@exemplo.com' })
    respond(200, SESSION)

    await expect(register('vini', 'vini@exemplo.com', 'segredo1')).resolves.toEqual(SESSION)

    expect(urlOf(0)).toMatch(/\/auth\/register$/)
    expect(bodyOf(0)).toEqual({ username: 'vini', email: 'vini@exemplo.com', password: 'segredo1' })
    expect(urlOf(1)).toMatch(/\/auth\/login$/)
    expect(bodyOf(1)).toEqual({ identifier: 'vini', password: 'segredo1' })
  })

  it('cadastro com usuário repetido não tenta o login', async () => {
    respond(409, { code: 'USERNAME_ALREADY_EXISTS', message: 'Username já está em uso' })

    await expect(register('vini', 'vini@exemplo.com', 'segredo1')).rejects.toMatchObject({
      status: 409,
      code: 'USERNAME_ALREADY_EXISTS',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('erro de validação traz os campos do back', async () => {
    respond(400, {
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      fields: { email: 'E-mail inválido' },
    })

    await expect(register('vini', 'x@y.zz', 'segredo1')).rejects.toMatchObject({
      fields: { email: 'E-mail inválido' },
    })
  })
})

describe('no modo simulado', () => {
  beforeEach(() => vi.stubGlobal('fetch', fetchMock))
  afterEach(() => vi.unstubAllGlobals())

  it('entra sem chamar o servidor', async () => {
    const session = await login('vini@exemplo.com', 'qualquer')
    expect(session.token).toMatch(/^token-simulado-/)
    expect(session.username).toBe('vini')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('mensagens de erro', () => {
  it('credencial errada vira uma mensagem neutra no formulário', () => {
    const error = new ApiError(401, 'Credenciais inválidas', 'INVALID_CREDENTIALS')
    expect(loginErrorFor(error)).toEqual({
      fields: {},
      form: 'E-mail, usuário ou senha incorretos.',
    })
  })

  it('usuário e e-mail já cadastrados vão para o campo certo', () => {
    expect(
      registerErrorFor(new ApiError(409, 'x', 'USERNAME_ALREADY_EXISTS')).fields.username,
    ).toMatch(/já está em uso/)
    expect(registerErrorFor(new ApiError(409, 'x', 'EMAIL_ALREADY_EXISTS')).fields.email).toMatch(
      /já tem uma conta/,
    )
  })

  it('validação do back só aproveita os campos daquele formulário', () => {
    const error = new ApiError(400, 'Dados inválidos', 'VALIDATION_ERROR', {
      password: 'Senha deve ter entre 6 e 72 caracteres',
      outro: 'ignorado',
    })
    expect(registerErrorFor(error).fields).toEqual({
      password: 'Senha deve ter entre 6 e 72 caracteres',
    })
  })

  it('sem rede ou erro 500 mostram mensagem amigável', () => {
    const network = new ApiError(
      0,
      'Não foi possível falar com o servidor. Verifique sua conexão.',
      'NETWORK',
    )
    expect(loginErrorFor(network).form).toMatch(/conexão/)
    expect(
      loginErrorFor(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR')).form,
    ).toMatch(/Tente de novo/)
    expect(loginErrorFor(new Error('qualquer')).form).toMatch(/Tente de novo/)
  })
})
