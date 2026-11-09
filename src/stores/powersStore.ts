import { create } from 'zustand'
import type { AbilityId, DeckSlot } from '../types/game'

export interface Aim {
  ability: AbilityId
  /** Casa já escolhida (ex: a peça do Tornado, antes do destino) */
  selectedCell: number | null
}

export interface PowersData {
  /** As 3 cartas do sorteio da 3ª habilidade e o prazo de 8s [RN-DRAFT-03] [RN-DRAFT-05] */
  drawOptions: { options: AbilityId[]; deadline: number } | null
  /** Meu deck da rodada (2 iniciais + 1 sorteada), como o servidor mandou */
  deck: DeckSlot[]
  /** Mira em andamento: o único estado local da Arena (ARCHITECTURE §3) */
  aim: Aim | null
}

interface PowersState extends PowersData {
  startAim: (ability: AbilityId) => void
  selectAimCell: (cell: number) => void
  cancelAim: () => void
}

export const INITIAL_POWERS_DATA: PowersData = { drawOptions: null, deck: [], aim: null }

// Deck e sorteio só mudam por evento do servidor (stores/serverEvents.ts). A mira é interface:
// escolher o alvo não usa a habilidade; a resolução vem do servidor.
export const usePowersStore = create<PowersState>()((set) => ({
  ...INITIAL_POWERS_DATA,
  startAim: (ability) => set({ aim: { ability, selectedCell: null } }),
  selectAimCell: (cell) => set((s) => (s.aim ? { aim: { ...s.aim, selectedCell: cell } } : s)),
  cancelAim: () => set({ aim: null }),
}))
