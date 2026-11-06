// Loja e Coins pelo REST do back (FE-30, FE-49) [RF-LOJ-01] [RF-LOJ-02] [RN-LOJ-04]. Rotas do
// ShopController e do CoinController, conferidas contra o back na FE-49. No simulado, a conta fica
// no aparelho.
import { ABILITY_INFO } from '../constants/abilities'
import { CHARACTER_INFO } from '../constants/characters'
import { isAbilityId, isCharacterId } from '../lib/shop'
import { isMockServerEnabled } from '../sockets/mode'
import { apiRequest } from './client'
import {
  MOCK_COIN_PACKAGES,
  mockBalance,
  mockBuyCoins,
  mockCatalog,
  mockDelay,
  mockEquip,
  mockPurchase,
} from './mockAccount'

/** Categoria como o back devolve no item (enum ShopCategory). Avatares ficam para depois do MVP */
export type ShopCategory = 'CHARACTERS' | 'SKILLS'

/** Item do catálogo (ShopItem do back). `code` é o id do front: 'X', 'TRIANGULO', 'BOMBA'... */
export interface ShopItem {
  /** UUID no back: o front só repassa, nunca monta nem interpreta */
  id: string
  category: ShopCategory
  code: string
  /** Nome do front para os códigos que ele conhece ("Campo de Força"); o do back nos outros */
  name: string
  description: string
  priceCoins: number
  owned: boolean
  /** Personagem favorito do jogador (só personagens) */
  equipped: boolean
}

/** Resposta da compra: o item já com `owned: true` e o saldo depois do débito */
export interface Purchase {
  item: ShopItem
  coinsBalance: number
}

/** Pacote simbólico de Coins: não existe pagamento de verdade [RN-LOJ-04] */
export interface CoinPackage {
  id: string
  coins: number
  priceInReais: number
}

/** Caminho da categoria nas rotas do back */
const PATH: Record<ShopCategory, string> = { CHARACTERS: 'characters', SKILLS: 'skills' }

/**
 * O back manda o nome das habilidades em maiúsculas e sem acento ("CAMPO DE FORCA"). Texto da
 * interface fica no front: para um código conhecido, vale o nome das constantes.
 */
function withFrontName(item: ShopItem): ShopItem {
  const { category, code } = item
  if (category === 'CHARACTERS' && isCharacterId(code)) {
    return { ...item, name: CHARACTER_INFO[code].name }
  }
  if (category === 'SKILLS' && isAbilityId(code)) return { ...item, name: ABILITY_INFO[code].name }
  return item
}

export async function getCatalog(category: ShopCategory): Promise<ShopItem[]> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return mockCatalog(category)
  }
  const items = await apiRequest<ShopItem[]>(`/shop/${PATH[category]}`)
  return items.map(withFrontName)
}

/**
 * Compra um item com Coins. Erros do back: 409 `INSUFFICIENT_COINS` e 409
 * `SHOP_ITEM_ALREADY_OWNED`. Saldo e posse mudam só com a resposta (nada otimista).
 */
export async function purchase(category: ShopCategory, itemId: string): Promise<Purchase> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return mockPurchase(category, itemId)
  }
  const result = await apiRequest<Purchase>(`/shop/${PATH[category]}/${itemId}/purchase`, {
    method: 'POST',
  })
  return { ...result, item: withFrontName(result.item) }
}

/** Equipa um personagem (o favorito do Hub). Não comprado: 403 `SHOP_ITEM_NOT_OWNED` */
export async function equip(itemId: string): Promise<ShopItem> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return mockEquip(itemId)
  }
  return withFrontName(
    await apiRequest<ShopItem>(`/shop/characters/${itemId}/equip`, { method: 'PUT' }),
  )
}

export async function getBalance(): Promise<number> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return mockBalance()
  }
  const { coinsBalance } = await apiRequest<{ coinsBalance: number }>('/coins/balance')
  return coinsBalance
}

export async function getCoinPackages(): Promise<CoinPackage[]> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return MOCK_COIN_PACKAGES
  }
  return apiRequest<CoinPackage[]>('/coins/packages')
}

/** Compra simbólica de um pacote de Coins: devolve o saldo novo, já com o crédito do back */
export async function buyCoins(packageId: string): Promise<number> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return mockBuyCoins(packageId)
  }
  const { coinsBalance } = await apiRequest<{ coinsBalance: number }>(
    `/coins/packages/${packageId}/purchase`,
    { method: 'POST' },
  )
  return coinsBalance
}
