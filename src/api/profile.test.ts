import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from './auth'
import { resetMockAccounts } from './mockAccount'
import { getProfile, getStats, updateUsername } from './profile'

// Sem a espera de 300ms do simulado: os testes não precisam do "carregando"
vi.mock('./mockAccount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./mockAccount')>()),
  mockDelay: () => Promise.resolve(),
}))

const fetchMock = vi.fn<typeof fetch>()

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
}

const urlOf = (n: number) => String(fetchMock.mock.calls[n][0])
const initOf = (n: number) => fetchMock.mock.calls[n][1]

describe('perfil com o back de verdade', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('GET /profile e GET /profile/stats devolvem os campos do back', async () => {
    const profile = {
      username: 'vini',
      coinsBalance: 150,
      avatar: 'DEFAULT',
      preferredCharacter: 'Triângulo',
      equippedCharacter: 'TRIANGULO',
    }
    const stats = {
      matchesPlayed: 10,
      wins: 6,
      currentWinStreak: 2,
      longestWinStreak: 4,
      winRate: 60,
    }
    respond(200, profile)
    respond(200, stats)

    await expect(getProfile()).resolves.toEqual(profile)
    await expect(getStats()).resolves.toEqual(stats)
    expect(urlOf(0)).toMatch(/\/profile$/)
    expect(urlOf(1)).toMatch(/\/profile\/stats$/)
  })

  it('trocar o apelido é PATCH /profile/username com o nome sem espaços (204)', async () => {
    respond(204)

    await updateUsername('  vini5ma ')

    expect(urlOf(0)).toMatch(/\/profile\/username$/)
    expect(initOf(0)?.method).toBe('PATCH')
    expect(JSON.parse(String(initOf(0)?.body))).toEqual({ username: 'vini5ma' })
  })

  it('apelido em uso chega com o code do back', async () => {
    respond(409, { code: 'USERNAME_ALREADY_EXISTS', message: 'Username já cadastrado.' })

    await expect(updateUsername('rafa')).rejects.toMatchObject({
      status: 409,
      code: 'USERNAME_ALREADY_EXISTS',
    })
  })
})

describe('perfil no modo simulado', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMockAccounts()
  })

  it('conta nova: apelido do login, 0 Coins e estatísticas zeradas', async () => {
    await login('vini@exemplo.com', 'qualquer')

    await expect(getProfile()).resolves.toEqual({
      username: 'vini',
      coinsBalance: 0,
      avatar: 'DEFAULT',
      preferredCharacter: null,
      equippedCharacter: null,
    })
    await expect(getStats()).resolves.toEqual({
      matchesPlayed: 0,
      wins: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      winRate: 0,
    })
  })

  it('o apelido novo continua depois de recarregar a página', async () => {
    await login('vini', 'qualquer')
    await updateUsername('Vinizera')

    // Recarregar: a memória some, o localStorage fica
    const saved = localStorage.getItem('jdv.mockAccounts')
    resetMockAccounts()
    localStorage.setItem('jdv.mockAccounts', saved ?? '')

    await expect(getProfile()).resolves.toMatchObject({ username: 'Vinizera' })
  })

  it('apelido de outra conta dá USERNAME_ALREADY_EXISTS, sem diferenciar maiúsculas', async () => {
    await login('rafa', 'qualquer')
    await login('vini', 'qualquer')

    await expect(updateUsername('RAFA')).rejects.toMatchObject({
      status: 409,
      code: 'USERNAME_ALREADY_EXISTS',
    })
    // O próprio apelido, com outra caixa, não é erro (como no back)
    await expect(updateUsername('VINI')).resolves.toBeUndefined()
    await expect(getProfile()).resolves.toMatchObject({ username: 'VINI' })
  })
})
