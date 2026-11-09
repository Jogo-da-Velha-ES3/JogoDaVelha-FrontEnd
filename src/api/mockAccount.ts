// Conta do jogador no modo simulado (FE-30): faz o papel do banco do back enquanto a integração
// (FE-49) não chega. Fica no localStorage, então compras, Coins e apelido continuam depois de
// recarregar a página. Os erros usam os mesmos `code` e status do back (ShopService, BE-027).
import { ABILITY_INFO } from '../constants/abilities'
import { CHARACTER_INFO } from '../constants/characters'
import {
  ABILITIES,
  ABILITY_PRICE,
  CHARACTERS,
  STARTER_ABILITIES,
  STARTER_CHARACTERS,
  STARTING_COINS,
} from '../constants/game'
import { PROFILE_TEXTS } from '../constants/texts'
import type { AbilityId, CharacterId } from '../types/game'
import { ApiError } from './client'
import type { Profile, ProfileStats } from './profile'
import type { CoinPackage, Purchase, ShopCategory, ShopItem } from './shop'

/** Espera de cada chamada no simulado, para a tela mostrar o "carregando" como com o back */
export const MOCK_ACCOUNT_DELAY_MS = 300

const STORAGE_KEY = 'jdv.mockAccounts'
const DEFAULT_USERNAME = 'Jogador'

/** Pacotes do back (migração V21): mesmos valores, ids próprios do simulado */
export const MOCK_COIN_PACKAGES: CoinPackage[] = [
  { id: 'simulado-pacote-100', coins: 100, priceInReais: 4.99 },
  { id: 'simulado-pacote-500', coins: 500, priceInReais: 19.99 },
  { id: 'simulado-pacote-1000', coins: 1000, priceInReais: 34.99 },
]

interface MockAccount {
  username: string
  coinsBalance: number
  characters: CharacterId[]
  skills: AbilityId[]
  equippedCharacter: CharacterId | null
  stats: Omit<ProfileStats, 'winRate'>
}

interface MockStore {
  /** Chave (apelido em minúsculas) de quem entrou por último neste aparelho */
  current: string | null
  accounts: Record<string, MockAccount>
}

/** Resultado da partida do ponto de vista do jogador, para as estatísticas */
export type MockMatchResult = 'WIN' | 'DRAW' | 'LOSS'

const keyOf = (username: string) => username.trim().toLowerCase()

/** Conta nova [RN-LOJ-01]: X e O, Bomba, Escudo e Ampulheta, 0 Coins, sem personagem equipado */
function newAccount(username: string): MockAccount {
  return {
    username,
    coinsBalance: STARTING_COINS,
    characters: [...STARTER_CHARACTERS],
    skills: [...STARTER_ABILITIES],
    equippedCharacter: null,
    stats: { matchesPlayed: 0, wins: 0, currentWinStreak: 0, longestWinStreak: 0 },
  }
}

// Navegação privada ou armazenamento bloqueado: a conta dura só enquanto a página está aberta
let memory: MockStore = { current: null, accounts: {} }

function readStore(): MockStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) memory = JSON.parse(saved) as MockStore
  } catch {
    // Fica com o que está na memória
  }
  return memory
}

function writeStore(store: MockStore): void {
  memory = store
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Sem armazenamento: fica só na memória
  }
}

/** Conta de quem está logado; cria a padrão se ninguém entrou pelo simulado ainda */
function currentAccount(store: MockStore): MockAccount {
  const key = store.current ?? keyOf(DEFAULT_USERNAME)
  store.current = key
  store.accounts[key] ??= newAccount(DEFAULT_USERNAME)
  return store.accounts[key]
}

/** Lê a conta atual, aplica a mudança e grava tudo de volta */
function update<T>(change: (account: MockAccount, store: MockStore) => T): T {
  const store = readStore()
  const result = change(currentAccount(store), store)
  writeStore(store)
  return result
}

export const mockDelay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, MOCK_ACCOUNT_DELAY_MS))

/** Login ou cadastro no simulado: passa a usar a conta desse apelido (e cria, se for nova) */
export function switchMockAccount(username: string): void {
  const store = readStore()
  const key = keyOf(username)
  store.accounts[key] ??= newAccount(username.trim())
  store.current = key
  writeStore(store)
}

/** Apaga todas as contas simuladas (testes) */
export function resetMockAccounts(): void {
  memory = { current: null, accounts: {} }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada a limpar
  }
}

// ---- Perfil (GET /profile, GET /profile/stats, PATCH /profile/username) ----------------------

export function mockProfile(): Profile {
  return update((account) => ({
    username: account.username,
    coinsBalance: account.coinsBalance,
    avatar: 'DEFAULT',
    // No back é o personagem mais usado nas partidas; o simulado não guarda o histórico
    preferredCharacter: null,
    equippedCharacter: account.equippedCharacter,
  }))
}

export function mockStats(): ProfileStats {
  return update(({ stats }) => ({
    ...stats,
    winRate:
      stats.matchesPlayed === 0 ? 0 : Math.round((stats.wins / stats.matchesPlayed) * 1000) / 10,
  }))
}

export function mockRename(username: string): void {
  const next = username.trim()
  update((account, store) => {
    const key = keyOf(next)
    const owner = store.accounts[key]
    // O próprio apelido atual (mesmo com outra caixa) não é erro, como no back
    if (owner && owner !== account) {
      throw new ApiError(409, PROFILE_TEXTS.errors.usernameTaken, 'USERNAME_ALREADY_EXISTS')
    }
    delete store.accounts[store.current ?? key]
    account.username = next
    store.accounts[key] = account
    store.current = key
  })
}

// ---- Loja e Coins (GET /shop/{categoria}, compra, equipar, GET /coins/...) -------------------

/** Id do item no simulado. No back é um UUID: o front só repassa, nunca interpreta */
const itemId = (category: ShopCategory, code: string) => `simulado-${category}-${code}`

function characterItem(account: MockAccount, code: CharacterId): ShopItem {
  const info = CHARACTER_INFO[code]
  return {
    id: itemId('CHARACTERS', code),
    category: 'CHARACTERS',
    code,
    name: info.name,
    description: `Personagem ${info.name}.`,
    priceCoins: info.price,
    owned: account.characters.includes(code),
    equipped: account.equippedCharacter === code,
  }
}

function skillItem(account: MockAccount, code: AbilityId): ShopItem {
  const info = ABILITY_INFO[code]
  const starter = (STARTER_ABILITIES as readonly AbilityId[]).includes(code)
  return {
    id: itemId('SKILLS', code),
    category: 'SKILLS',
    code,
    name: info.name,
    description: info.description,
    // Como no back: as iniciais custam 0 e as outras 7, o preço único das habilidades
    priceCoins: starter ? 0 : ABILITY_PRICE,
    owned: account.skills.includes(code),
    equipped: false,
  }
}

function catalogOf(account: MockAccount, category: ShopCategory): ShopItem[] {
  return category === 'CHARACTERS'
    ? CHARACTERS.map((code) => characterItem(account, code))
    : ABILITIES.map((code) => skillItem(account, code))
}

function findItem(account: MockAccount, category: ShopCategory, id: string): ShopItem {
  const item = catalogOf(account, category).find((candidate) => candidate.id === id)
  if (!item) throw new ApiError(404, PROFILE_TEXTS.errors.itemNotFound, 'SHOP_ITEM_NOT_FOUND')
  return item
}

export function mockCatalog(category: ShopCategory): ShopItem[] {
  return update((account) => catalogOf(account, category))
}

export function mockPurchase(category: ShopCategory, id: string): Purchase {
  return update((account) => {
    const item = findItem(account, category, id)
    if (item.owned) {
      throw new ApiError(409, PROFILE_TEXTS.errors.alreadyOwned, 'SHOP_ITEM_ALREADY_OWNED')
    }
    if (account.coinsBalance < item.priceCoins) {
      throw new ApiError(409, PROFILE_TEXTS.errors.insufficientCoins, 'INSUFFICIENT_COINS')
    }
    account.coinsBalance -= item.priceCoins
    if (category === 'CHARACTERS') account.characters.push(item.code as CharacterId)
    else account.skills.push(item.code as AbilityId)
    return { item: { ...item, owned: true }, coinsBalance: account.coinsBalance }
  })
}

export function mockEquip(id: string): ShopItem {
  return update((account) => {
    const item = findItem(account, 'CHARACTERS', id)
    if (!item.owned) throw new ApiError(403, PROFILE_TEXTS.errors.notOwned, 'SHOP_ITEM_NOT_OWNED')
    account.equippedCharacter = item.code as CharacterId
    return { ...item, equipped: true }
  })
}

export function mockBalance(): number {
  return update((account) => account.coinsBalance)
}

export function mockBuyCoins(packageId: string): number {
  const pack = MOCK_COIN_PACKAGES.find((candidate) => candidate.id === packageId)
  // Como no back: pacote inexistente é 400 (IllegalArgumentException no CoinPurchaseService)
  if (!pack) throw new ApiError(400, PROFILE_TEXTS.errors.packageNotFound, 'ROOM_BAD_REQUEST')
  return update((account) => {
    // Compra simbólica: crédito imediato, sem pagamento de verdade [RN-LOJ-04]
    account.coinsBalance += pack.coins
    return account.coinsBalance
  })
}

// ---- Fim de partida (servidor simulado) -----------------------------------------------------

/**
 * O servidor simulado chama no `MATCH_END`: credita os Coins e conta a partida, como o back faz
 * do lado dele. A sequência é interrompida por empate ou derrota; W.O. a favor conta como vitória.
 */
export function recordMockMatch(result: MockMatchResult, coins: number): void {
  update((account) => {
    const { stats } = account
    account.coinsBalance += coins
    stats.matchesPlayed += 1
    if (result === 'WIN') {
      stats.wins += 1
      stats.currentWinStreak += 1
      stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentWinStreak)
    } else {
      stats.currentWinStreak = 0
    }
  })
}
