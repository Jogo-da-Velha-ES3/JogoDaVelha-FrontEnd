import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface RoomState {
  /**
   * Código de um link direto (/sala/4821) aberto sem sessão: o jogador passa pelo Acesso
   * e volta para a sala. Fica no sessionStorage para sobreviver a um reload no /entrar.
   */
  pendingRoomCode: string | null
  setPendingRoomCode: (code: string | null) => void
}

// Por enquanto só o link direto (FE-07); código, phase e jogadores entram com a FE-12/FE-28
export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      pendingRoomCode: null,
      setPendingRoomCode: (pendingRoomCode) => set({ pendingRoomCode }),
    }),
    {
      name: 'jdv.pendingRoom',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ pendingRoomCode }) => ({ pendingRoomCode }),
    },
  ),
)
