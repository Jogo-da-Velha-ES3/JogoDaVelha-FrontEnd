import { create } from 'zustand'
import type { TurnActions, TurnState } from '../types/game'

export interface TimerState {
  /** Turno atual: de quem é, início (relógio do servidor) e duração (10s ou 5s) [RF-ARN-02] */
  turn: TurnState | null
  /**
   * O que o jogador da vez já fez no turno: 1 jogada e 1 habilidade, em qualquer ordem e no mesmo
   * prazo (BE-046). As duas marcadas também quando o servidor já fechou o turno e o próximo
   * TURN_START ainda não chegou (serverEvents)
   */
  actions: TurnActions
  /**
   * Versão do estado da partida (`stateVersion` do back): cresce a cada mudança confirmada e é a
   * mesma nos eventos de uma mudança só. Evento de jogo mais antigo que ela é descartado. Recomeça
   * em cada partida
   */
  stateVersion: number | null
}

export const NO_TURN_ACTIONS: TurnActions = { abilityUsed: false, moveUsed: false }

export const INITIAL_TIMER_STATE: TimerState = {
  turn: null,
  actions: NO_TURN_ACTIONS,
  stateVersion: null,
}

// Só muda por evento do servidor (stores/serverEvents.ts). Para desenhar: <TimerBar deadline={turn} />
export const useTimerStore = create<TimerState>()(() => INITIAL_TIMER_STATE)
