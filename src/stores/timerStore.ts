import { create } from 'zustand'
import type { TurnState } from '../types/game'

export interface TimerState {
  /** Turno atual: de quem é, início (relógio do servidor) e duração (10s ou 5s) [RF-ARN-02] */
  turn: TurnState | null
}

export const INITIAL_TIMER_STATE: TimerState = { turn: null }

// Só muda por evento do servidor (stores/serverEvents.ts). Para desenhar: <TimerBar deadline={turn} />
export const useTimerStore = create<TimerState>()(() => INITIAL_TIMER_STATE)
