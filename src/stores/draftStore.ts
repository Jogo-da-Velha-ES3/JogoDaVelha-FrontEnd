import { create } from 'zustand'
import type { CharacterId, PlayerSlot } from '../types/game'

export interface DraftState {
  /** Fim dos 20s da Preparação (timestamp do servidor) [RN-DRAFT-04] */
  deadline: number | null
  /** Personagem reservado por cada jogador: bloqueado para o outro [RN-DRAFT-01] */
  characters: Partial<Record<PlayerSlot, CharacterId>>
  /** "escolhendo…" / "pronto" */
  ready: Record<PlayerSlot, boolean>
}

export const INITIAL_DRAFT_STATE: DraftState = {
  deadline: null,
  characters: {},
  ready: { P1: false, P2: false },
}

// Só muda por evento do servidor (stores/serverEvents.ts)
export const useDraftStore = create<DraftState>()(() => INITIAL_DRAFT_STATE)
