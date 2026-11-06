// REST de perfil, loja e Coins contra o back de verdade (FE-49), pelas mesmas funções que as telas
// usam (src/api e o profileStore). Fica pulado sem VITE_LIVE_BACK_URL, então não roda no `npm test`
// nem no CI. Cada teste cria contas novas, então pode rodar quantas vezes quiser no mesmo banco.
//
// Com o back rodando na máquina (docs/LOCAL_INTEGRATION.md):
//   VITE_LIVE_BACK_URL=http://localhost:8080 npx vitest run src/api/liveBack.test.ts
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type * as AuthApi from './auth'
import type * as ProfileApi from './profile'
import type * as ShopApi from './shop'
import type * as ProfileStoreModule from '../stores/profileStore'
import type * as AuthStoreModule from '../stores/authStore'

const BASE = import.meta.env.VITE_LIVE_BACK_URL

let auth: typeof AuthApi
let profile: typeof ProfileApi
let shop: typeof ShopApi
let profileStore: typeof ProfileStoreModule
let authStore: typeof AuthStoreModule

/** Carrega o front já apontado para o back (o endereço da API é lido quando o módulo carrega) */
async function loadFront(apiUrl: string) {
  vi.resetModules()
  vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
  vi.stubEnv('VITE_API_URL', apiUrl)
  ;[auth, profile, shop, profileStore, authStore] = await Promise.all([
    import('./auth'),
    import('./profile'),
    import('./shop'),
    import('../stores/profileStore'),
    import('../stores/authStore'),
  ])
}

/** Conta nova, já logada no front (token no authStore, como depois da tela de Acesso) */
async function newAccount(prefix: string): Promise<string> {
  const username = `${prefix}${Math.floor(Math.random() * 1e6)}`.slice(0, 15)
  // O cadastro já entra na conta, como a tela de Acesso
  const { token } = await auth.register(username, `${username}@teste.com`, 'senha123')
  authStore.useAuthStore.getState().login(token)
  return username
}

function itemOf(items: ShopApi.ShopItem[], code: string): ShopApi.ShopItem {
  const item = items.find((candidate) => candidate.code === code)
  if (!item) throw new Error(`${code} não está no catálogo do back`)
  return item
}

const ownedCodes = (items: ShopApi.ShopItem[]) =>
  items
    .filter((item) => item.owned)
    .map((item) => item.code)
    .sort()

describe.skipIf(!BASE)('REST de perfil, loja e Coins contra o back de verdade (FE-49)', () => {
  beforeAll(async () => {
    await loadFront(`${BASE}/api`)
  })

  afterEach(() => {
    authStore.useAuthStore.getState().logout()
  })

  it('conta nova: perfil, estatísticas e catálogo com os nomes do front [RN-LOJ-01]', async () => {
    const username = await newAccount('fe49nova')

    await expect(profile.getProfile()).resolves.toMatchObject({
      username,
      coinsBalance: 0,
      equippedCharacter: null,
    })
    await expect(profile.getStats()).resolves.toEqual({
      matchesPlayed: 0,
      wins: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      winRate: 0,
    })

    const characters = await shop.getCatalog('CHARACTERS')
    const skills = await shop.getCatalog('SKILLS')
    expect(ownedCodes(characters)).toEqual(['O', 'X'])
    expect(ownedCodes(skills)).toEqual(['AMPULHETA', 'BOMBA', 'ESCUDO'])
    // Preços da revisão de telas (06/10) e nomes do front, não os do banco ("CAMPO DE FORCA")
    expect(
      Object.fromEntries(characters.map((item) => [item.code, [item.name, item.priceCoins]])),
    ).toEqual({
      X: ['X', 0],
      O: ['O', 0],
      QUADRADO: ['Quadrado', 400],
      TRIANGULO: ['Triângulo', 500],
      CORACAO: ['Coração', 600],
      ESTRELA: ['Estrela', 700],
    })
    expect(itemOf(skills, 'CAMPO_DE_FORCA')).toMatchObject({
      name: 'Campo de Força',
      priceCoins: 350,
    })
    expect(itemOf(skills, 'SILENCIO').name).toBe('Silêncio')
    expect(itemOf(skills, 'TROCA_RAPIDA').name).toBe('Troca Rápida')
    expect(skills).toHaveLength(10)
  })

  it('sem saldo: a compra é recusada com INSUFFICIENT_COINS e nada muda', async () => {
    await newAccount('fe49semsaldo')
    const tornado = itemOf(await shop.getCatalog('SKILLS'), 'TORNADO')

    await expect(shop.purchase('SKILLS', tornado.id)).rejects.toMatchObject({
      status: 409,
      code: 'INSUFFICIENT_COINS',
    })
    expect(itemOf(await shop.getCatalog('SKILLS'), 'TORNADO').owned).toBe(false)
    await expect(shop.getBalance()).resolves.toBe(0)
  })

  it('Coins simbólicos pagam a compra; comprar de novo e equipar sem ter são recusados', async () => {
    await newAccount('fe49compra')

    const packages = await shop.getCoinPackages()
    expect(packages.map((pack) => pack.coins).sort((a, b) => a - b)).toEqual([100, 500, 1000])
    const pack500 = packages.find((pack) => pack.coins === 500)
    if (!pack500) throw new Error('pacote de 500 sumiu')

    // A compra simbólica devolve o saldo novo [RN-LOJ-04]
    await expect(shop.buyCoins(pack500.id)).resolves.toBe(500)
    await expect(shop.getBalance()).resolves.toBe(500)

    const characters = await shop.getCatalog('CHARACTERS')
    const quadrado = itemOf(characters, 'QUADRADO')
    const bought = await shop.purchase('CHARACTERS', quadrado.id)
    expect(bought).toMatchObject({
      item: { code: 'QUADRADO', name: 'Quadrado', owned: true },
      coinsBalance: 100,
    })
    await expect(shop.purchase('CHARACTERS', quadrado.id)).rejects.toMatchObject({
      status: 409,
      code: 'SHOP_ITEM_ALREADY_OWNED',
    })

    await expect(shop.equip(quadrado.id)).resolves.toMatchObject({
      code: 'QUADRADO',
      equipped: true,
    })
    await expect(profile.getProfile()).resolves.toMatchObject({ equippedCharacter: 'QUADRADO' })
    await expect(shop.equip(itemOf(characters, 'ESTRELA').id)).rejects.toMatchObject({
      status: 403,
      code: 'SHOP_ITEM_NOT_OWNED',
    })
  })

  it('apelido: troca, em uso (sem diferenciar maiúsculas) e fora do tamanho', async () => {
    const other = await newAccount('fe49outro')
    authStore.useAuthStore.getState().logout()
    const username = await newAccount('fe49apelido')

    const renamed = `n${username}`.slice(0, 15)
    await profile.updateUsername(`  ${renamed} `)
    await expect(profile.getProfile()).resolves.toMatchObject({ username: renamed })

    await expect(profile.updateUsername(other.toUpperCase())).rejects.toMatchObject({
      status: 409,
      code: 'USERNAME_ALREADY_EXISTS',
    })
    await expect(profile.updateUsername('ab')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fields: { username: expect.any(String) },
    })
    // O próprio apelido com outra caixa não é erro
    await expect(profile.updateUsername(renamed.toUpperCase())).resolves.toBeUndefined()
  })

  it('profileStore: carga do Hub e compra de Coins com os dados do back', async () => {
    const username = await newAccount('fe49store')
    const store = profileStore.useProfileStore

    await store.getState().loadProfile()
    expect(store.getState()).toMatchObject({ status: 'ready', coinsBalance: 0 })
    expect(store.getState().profile?.username).toBe(username)
    expect(profileStore.selectOwnedCharacters(store.getState())).toEqual(['X', 'O'])
    expect(profileStore.selectFavoriteCharacter(store.getState())).toBe('X')

    const [pack] = await shop.getCoinPackages()
    await store.getState().buyCoins(pack.id)
    expect(store.getState().coinsBalance).toBe(pack.coins)
  })

  it('token vencido ou inválido: 401 derruba a sessão (vai para o Acesso)', async () => {
    authStore.useAuthStore.getState().login('token.invalido.qualquer')

    await expect(profile.getProfile()).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    })
    expect(authStore.useAuthStore.getState().token).toBeNull()

    authStore.useAuthStore.getState().login('token.invalido.qualquer')
    await expect(auth.isSessionValid()).resolves.toBe(false)
    expect(authStore.useAuthStore.getState().token).toBeNull()

    await newAccount('fe49valida')
    await expect(auth.isSessionValid()).resolves.toBe(true)
  })

  it('back fora do ar: erro de rede, sem derrubar a sessão', async () => {
    await newAccount('fe49rede')
    const token = authStore.useAuthStore.getState().token
    // Porta sem ninguém ouvindo, como o back fora do ar
    await loadFront('http://localhost:1/api')
    authStore.useAuthStore.getState().login(token ?? '')

    await expect(profile.getProfile()).rejects.toMatchObject({ status: 0, code: 'NETWORK' })
    expect(authStore.useAuthStore.getState().token).toBe(token)

    await loadFront(`${BASE}/api`)
  })
})
