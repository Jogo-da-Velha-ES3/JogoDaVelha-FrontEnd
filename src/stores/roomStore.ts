import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ConnectionStatus } from '../sockets/types'
import type { PlayerSlot, PlayerState, RoomPhase } from '../types/game'

export interface RoomGameState {
  code: string | null
  /** Decide qual tela `/sala/:codigo` mostra (ARCHITECTURE §2) */
  phase: RoomPhase | null
  players: PlayerState[]
  mySlot: PlayerSlot | null
  /** Prazo para o oponente voltar depois de cair (timestamp do servidor) */
  reconnectDeadlines: Partial<Record<PlayerSlot, number>>
  closedReason: string | null
  lastError: { code: string; message: string; serverTime: number } | null
  connection: ConnectionStatus
}

interface RoomState extends RoomGameState {
  /**
   * Código de um link direto (/sala/4821) aberto sem sessão: o jogador passa pelo Acesso
   * e volta para a sala. Fica no sessionStorage para sobreviver a um reload no /entrar.
   */
  pendingRoomCode: string | null
  setPendingRoomCode: (code: string | null) => void
  /** Chamado pela camada de conexão (cliente STOMP ou servidor simulado), não pelas telas */
  setConnectionStatus: (status: ConnectionStatus) => void
}

export const INITIAL_ROOM_STATE: RoomGameState = {
  code: null,
  phase: null,
  players: [],
  mySlot: null,
  reconnectDeadlines: {},
  closedReason: null,
  lastError: null,
  connection: 'IDLE',
}

// O estado da sala só muda por evento do servidor (stores/serverEvents.ts)
export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      ...INITIAL_ROOM_STATE,
      pendingRoomCode: null,
      setPendingRoomCode: (pendingRoomCode) => set({ pendingRoomCode }),
      setConnectionStatus: (connection) => set({ connection }),
    }),
    {
      name: 'jdv.pendingRoom',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ pendingRoomCode }) => ({ pendingRoomCode }),
    },
  ),
)
