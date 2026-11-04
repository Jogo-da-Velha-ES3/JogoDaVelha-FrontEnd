import { create } from 'zustand'
import {
  getProfile,
  getStats,
  updateUsername,
  type Profile,
  type ProfileStats,
} from '../api/profile'
import {
  buyCoins as buyCoinsRequest,
  equip as equipRequest,
  getBalance,
  getCatalog,
  purchase,
  type ShopCategory,
  type ShopItem,
} from '../api/shop'
import { ABILITIES, CHARACTERS, STARTER_ABILITIES, STARTER_CHARACTERS } from '../constants/game'
import type { AbilityId, CharacterId } from '../types/game'
import { useAuthStore } from './authStore'
import { useMatchStore } from './matchStore'

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error'

interface ProfileData {
  status: ProfileStatus
  profile: Profile | null
  stats: ProfileStats | null
  /** Catálogo de personagens, com `owned` e `equipped` de cada um */
  characters: ShopItem[]
  /** Catálogo de habilidades, com `owned` de cada uma */
  skills: ShopItem[]
  /** Saldo confirmado pelo servidor; null antes de carregar */
  coinsBalance: number | null
}

interface ProfileState extends ProfileData {
  /** Perfil, estatísticas, catálogo e saldo. Ao abrir o Hub e depois de cada partida */
  loadProfile: () => Promise<void>
  /** Saldo e estatísticas de novo (ex: depois do MATCH_END, que credita os Coins no servidor) */
  refreshAfterMatch: () => Promise<void>
  /** Compra um item com Coins; erros do back saem como ApiError para a tela mostrar */
  buy: (category: ShopCategory, itemId: string) => Promise<void>
  /** Compra simbólica de Coins: o back não devolve o saldo, então ele é buscado em seguida */
  buyCoins: (packageId: string) => Promise<void>
  rename: (username: string) => Promise<void>
  /** Equipa um personagem comprado: ele vira o favorito do Hub */
  equip: (itemId: string) => Promise<void>
}

const EMPTY: ProfileData = {
  status: 'idle',
  profile: null,
  stats: null,
  characters: [],
  skills: [],
  coinsBalance: null,
}

// Cada carga ganha um número; resposta de uma carga antiga (ex: chegou depois do Sair) é ignorada
let generation = 0

// Reflete só o que o servidor confirmou (ARCHITECTURE §3): cada ação chama a API e só grava a
// resposta. Nada de somar Coins ou marcar item como comprado antes da confirmação.
export const useProfileStore = create<ProfileState>()((set, get) => {
  /** Grava só se ninguém saiu da conta nem recomeçou a carga enquanto a resposta vinha */
  const setIfCurrent = (current: number, changes: Partial<ProfileData>) => {
    if (current === generation) set(changes)
  }

  return {
    ...EMPTY,

    loadProfile: async () => {
      const current = ++generation
      set({ status: 'loading' })
      try {
        const [profile, stats, characters, skills] = await Promise.all([
          getProfile(),
          getStats(),
          getCatalog('CHARACTERS'),
          getCatalog('SKILLS'),
        ])
        setIfCurrent(current, {
          status: 'ready',
          profile,
          stats,
          characters,
          skills,
          coinsBalance: profile.coinsBalance,
        })
      } catch {
        // Mantém o que já tinha na tela; quem quiser avisa pelo `status`
        setIfCurrent(current, { status: 'error' })
      }
    },

    refreshAfterMatch: async () => {
      if (get().status === 'idle') return // nunca carregou: o Hub carrega tudo ao abrir
      const current = generation
      try {
        const [coinsBalance, stats] = await Promise.all([getBalance(), getStats()])
        setIfCurrent(current, { coinsBalance, stats })
      } catch {
        // O saldo antigo continua; a próxima carga do Hub corrige
      }
    },

    buy: async (category, itemId) => {
      const current = generation
      const { item, coinsBalance } = await purchase(category, itemId)
      setIfCurrent(
        current,
        category === 'CHARACTERS'
          ? { characters: replaceItem(get().characters, item), coinsBalance }
          : { skills: replaceItem(get().skills, item), coinsBalance },
      )
    },

    buyCoins: async (packageId) => {
      const current = generation
      await buyCoinsRequest(packageId)
      setIfCurrent(current, { coinsBalance: await getBalance() })
    },

    rename: async (username) => {
      const current = generation
      await updateUsername(username)
      // 204 sem corpo: o apelido confirmado é o que foi enviado
      const { profile } = get()
      if (profile) setIfCurrent(current, { profile: { ...profile, username: username.trim() } })
    },

    equip: async (itemId) => {
      const current = generation
      const equipped = await equipRequest(itemId)
      setIfCurrent(current, {
        characters: get().characters.map((item) =>
          item.id === equipped.id ? equipped : { ...item, equipped: false },
        ),
      })
    },
  }
})

function replaceItem(items: ShopItem[], next: ShopItem): ShopItem[] {
  return items.map((item) => (item.id === next.id ? next : item))
}

/** Volta ao começo (ex: Sair da conta). Respostas que ainda estavam a caminho são ignoradas */
export function resetProfile(): void {
  generation += 1
  useProfileStore.setState(EMPTY)
}

// ---- Seletores ----------------------------------------------------------------------------

const isCharacterId = (code: string): code is CharacterId =>
  (CHARACTERS as readonly string[]).includes(code)
const isAbilityId = (code: string): code is AbilityId =>
  (ABILITIES as readonly string[]).includes(code)

/** Personagem do topo e do centro do Hub: o equipado; sem nenhum, o X [RN-LOJ-01] */
export function selectFavoriteCharacter(state: ProfileData): CharacterId {
  const code = state.characters.find((item) => item.equipped)?.code
  return code && isCharacterId(code) ? code : 'X'
}

/** Personagens comprados; antes de carregar, só os iniciais (X e O) */
export function selectOwnedCharacters(state: ProfileData): CharacterId[] {
  if (state.characters.length === 0) return [...STARTER_CHARACTERS]
  return state.characters
    .filter((item) => item.owned)
    .map((item) => item.code)
    .filter(isCharacterId)
}

/** Habilidades compradas; antes de carregar, só as iniciais (Bomba, Escudo e Ampulheta) */
export function selectOwnedAbilities(state: ProfileData): AbilityId[] {
  if (state.skills.length === 0) return [...STARTER_ABILITIES]
  return state.skills
    .filter((item) => item.owned)
    .map((item) => item.code)
    .filter(isAbilityId)
}

// ---- Ligações com o resto do jogo ---------------------------------------------------------

// Sair da conta (ou um 401 que derruba a sessão): os dados do jogador saem da memória
useAuthStore.subscribe((state, previous) => {
  if (previous.token !== null && state.token === null) resetProfile()
})

// MATCH_END: os Coins da partida são creditados pelo servidor; o front só busca o saldo novo
useMatchStore.subscribe((state, previous) => {
  if (previous.outcome === null && state.outcome !== null) {
    void useProfileStore.getState().refreshAfterMatch()
  }
})
