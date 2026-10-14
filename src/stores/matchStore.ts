import { create } from 'zustand'
import type { Score } from '../lib/match'
import type { MatchOutcome, PlayerSlot } from '../types/game'
import type { ServerEvent } from '../types/events'

type CancelReason = Extract<ServerEvent, { type: 'REMATCH_CANCELLED' }>['payload']['reason']

export interface MatchState {
  /** 0 = a partida ainda não começou */
  round: number
  /** Placar como o servidor mandou; o front nunca calcula [RF-ARN-05] */
  score: Score
  suddenDeath: boolean
  startingPlayer: PlayerSlot | null
  /** Estouros seguidos de cada lado (0–3). Não zera na troca de round [RN-ARN-01] */
  consecutiveTimeouts: Score
  /** Último estouro, para disparar o aviso "1/3", "2/3" (serverTime diferencia avisos iguais) */
  lastTimeout: { player: PlayerSlot; consecutiveTimeouts: number; serverTime: number } | null
  /** Fim do último round: vencedor (null = empate) e linha vencedora */
  roundEnd: { round: number; winner: PlayerSlot | null; winningLine: number[] | null } | null
  /** Vitória, empate absoluto ou W.O. [RN-ARN-06] */
  outcome: MatchOutcome | null
  /** Coins creditados pelo back a cada lado */
  coins: Score | null
  rematch: { requestedBy: PlayerSlot; deadline: number } | null
  rematchCancelled: CancelReason | null
}

export const INITIAL_MATCH_STATE: MatchState = {
  round: 0,
  score: { P1: 0, P2: 0 },
  suddenDeath: false,
  startingPlayer: null,
  consecutiveTimeouts: { P1: 0, P2: 0 },
  lastTimeout: null,
  roundEnd: null,
  outcome: null,
  coins: null,
  rematch: null,
  rematchCancelled: null,
}

// Só muda por evento do servidor (stores/serverEvents.ts)
export const useMatchStore = create<MatchState>()(() => INITIAL_MATCH_STATE)
