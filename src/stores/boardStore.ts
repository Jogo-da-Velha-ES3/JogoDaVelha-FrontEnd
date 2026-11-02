import { create } from 'zustand'
import { BOARD_CELLS } from '../constants/game'
import type { Cell } from '../types/game'
import type { ServerEvent } from '../types/events'

type AbilityResolved = Extract<ServerEvent, { type: 'ABILITY_RESOLVED' }>['payload']

/** Habilidade resolvida pelo servidor; `receivedAt` (relógio do aparelho) marca o efeito e o aviso */
export type ResolvedAbility = AbilityResolved & { serverTime: number; receivedAt: number }

export interface BoardState {
  /** As 16 casas com dono e efeitos (Escudo, Congelar, Reforço com contador) */
  cells: Cell[]
  /** Linha vencedora confirmada pelo servidor no fim do round */
  winningLine: number[] | null
  /** Última habilidade resolvida, para a animação e o aviso ("anulada", "sem efeito") */
  lastAbility: ResolvedAbility | null
}

export const emptyCells = (): Cell[] =>
  Array.from({ length: BOARD_CELLS }, (_, index) => ({ index, owner: null, effects: [] }))

export const initialBoardState = (): BoardState => ({
  cells: emptyCells(),
  winningLine: null,
  lastAbility: null,
})

// Só muda por evento do servidor (stores/serverEvents.ts)
export const useBoardStore = create<BoardState>()(initialBoardState)
