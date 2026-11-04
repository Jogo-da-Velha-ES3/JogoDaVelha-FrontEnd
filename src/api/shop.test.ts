import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from './auth'
import { recordMockMatch, resetMockAccounts } from './mockAccount'
import {
  buyCoins,
  equip,
  getBalance,
  getCatalog,
  getCoinPackages,
  purchase,
  type ShopItem,
} from './shop'

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
const methodOf = (n: number) => fetchMock.mock.calls[n][1]?.method

const owned = (items: ShopItem[]) => items.filter((item) => item.owned).map((item) => item.code)
function itemOf(items: ShopItem[], code: string): ShopItem {
  const item = items.find((candidate) => candidate.code === code)
  if (!item) throw new Error(`${code} não está no catálogo`)
  return item
}

describe('loja com o back de verdade', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('usa as rotas do ShopController e do CoinController', async () => {
    respond(200, [])
    respond(200, [])
    respond(200, { item: {}, coinsBalance: 50 })
    respond(200, {})
    respond(200, { coinsBalance: 50 })
    respond(200, [])
    respond(204)

    await getCatalog('CHARACTERS')
    await getCatalog('SKILLS')
    await purchase('SKILLS', 'uuid-tornado')
    await equip('uuid-triangulo')
    await expect(getBalance()).resolves.toBe(50)
    await getCoinPackages()
    await buyCoins('uuid-pacote')

    expect(urlOf(0)).toMatch(/\/shop\/characters$/)
    expect(urlOf(1)).toMatch(/\/shop\/skills$/)
    expect(urlOf(2)).toMatch(/\/shop\/skills\/uuid-tornado\/purchase$/)
    expect(methodOf(2)).toBe('POST')
    expect(urlOf(3)).toMatch(/\/shop\/characters\/uuid-triangulo\/equip$/)
    expect(methodOf(3)).toBe('PUT')
    expect(urlOf(4)).toMatch(/\/coins\/balance$/)
    expect(urlOf(5)).toMatch(/\/coins\/packages$/)
    expect(urlOf(6)).toMatch(/\/coins\/packages\/uuid-pacote\/purchase$/)
    expect(methodOf(6)).toBe('POST')
  })

  it('saldo insuficiente chega com o code do back', async () => {
    respond(409, { code: 'INSUFFICIENT_COINS', message: 'Saldo de Coins insuficiente.' })

    await expect(purchase('CHARACTERS', 'uuid')).rejects.toMatchObject({
      status: 409,
      code: 'INSUFFICIENT_COINS',
    })
  })
})

describe('loja no modo simulado', () => {
  beforeEach(async () => {
    localStorage.clear()
    resetMockAccounts()
    await login('vini', 'qualquer')
  })

  it('conta nova tem X e O, Bomba, Escudo e Ampulheta, com os preços do jogo [RN-LOJ-01]', async () => {
    const characters = await getCatalog('CHARACTERS')
    const skills = await getCatalog('SKILLS')

    expect(owned(characters)).toEqual(['X', 'O'])
    expect(owned(skills)).toEqual(['BOMBA', 'ESCUDO', 'AMPULHETA'])
    expect(characters.some((item) => item.equipped)).toBe(false)
    expect(itemOf(characters, 'ESTRELA')).toMatchObject({ category: 'CHARACTERS', priceCoins: 700 })
    expect(itemOf(skills, 'TORNADO')).toMatchObject({ category: 'SKILLS', priceCoins: 350 })
    expect(itemOf(skills, 'BOMBA').priceCoins).toBe(0)
    await expect(getBalance()).resolves.toBe(0)
  })

  it('sem saldo, a compra falha com INSUFFICIENT_COINS e nada muda', async () => {
    const tornado = itemOf(await getCatalog('SKILLS'), 'TORNADO')

    await expect(purchase('SKILLS', tornado.id)).rejects.toMatchObject({
      status: 409,
      code: 'INSUFFICIENT_COINS',
    })
    expect(itemOf(await getCatalog('SKILLS'), 'TORNADO').owned).toBe(false)
  })

  it('Coins simbólicos entram na hora e pagam a compra; comprar de novo dá ALREADY_OWNED', async () => {
    const [pack] = await getCoinPackages()
    expect(pack).toMatchObject({ coins: 100, priceInReais: 4.99 })
    await buyCoins(pack.id)
    await buyCoins(pack.id)
    await buyCoins(pack.id)
    await buyCoins(pack.id)
    await expect(getBalance()).resolves.toBe(400)

    const tornado = itemOf(await getCatalog('SKILLS'), 'TORNADO')
    const result = await purchase('SKILLS', tornado.id)

    expect(result).toMatchObject({ item: { code: 'TORNADO', owned: true }, coinsBalance: 50 })
    await expect(purchase('SKILLS', tornado.id)).rejects.toMatchObject({
      status: 409,
      code: 'SHOP_ITEM_ALREADY_OWNED',
    })
  })

  it('compra e Coins ganhos na partida continuam depois de recarregar a página', async () => {
    recordMockMatch('WIN', 500)
    const quadrado = itemOf(await getCatalog('CHARACTERS'), 'QUADRADO')
    await purchase('CHARACTERS', quadrado.id)

    const saved = localStorage.getItem('jdv.mockAccounts')
    resetMockAccounts()
    localStorage.setItem('jdv.mockAccounts', saved ?? '')

    expect(owned(await getCatalog('CHARACTERS'))).toEqual(['X', 'O', 'QUADRADO'])
    await expect(getBalance()).resolves.toBe(100)
  })

  it('equipar: só personagem comprado, e só um equipado por vez', async () => {
    const characters = await getCatalog('CHARACTERS')

    await expect(equip(itemOf(characters, 'ESTRELA').id)).rejects.toMatchObject({
      status: 403,
      code: 'SHOP_ITEM_NOT_OWNED',
    })
    await expect(equip(itemOf(characters, 'O').id)).resolves.toMatchObject({
      code: 'O',
      equipped: true,
    })
    await equip(itemOf(characters, 'X').id)

    const after = await getCatalog('CHARACTERS')
    expect(after.filter((item) => item.equipped).map((item) => item.code)).toEqual(['X'])
  })
})
