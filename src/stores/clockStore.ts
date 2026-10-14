import { create } from 'zustand'
import { estimateClockOffset } from '../lib/timer'

/** Quantas medidas recentes guardar */
const SAMPLE_WINDOW = 10

interface ClockState {
  /** Servidor − aparelho, em ms. Somar ao Date.now() dá a hora do servidor */
  offsetMs: number
  samples: number[]
  /** Chamado pelo cliente STOMP a cada mensagem, com o `serverTime` do envelope */
  syncWithServer: (serverTime: number, receivedAt?: number) => void
  reset: () => void
}

// A latência só faz a medida sair menor que a real; a maior das medidas recentes é a que
// passou menos tempo na rede, então é a melhor estimativa.
export const useClockStore = create<ClockState>()((set) => ({
  offsetMs: 0,
  samples: [],
  syncWithServer: (serverTime, receivedAt = Date.now()) =>
    set((state) => {
      const samples = [...state.samples, estimateClockOffset(serverTime, receivedAt)].slice(
        -SAMPLE_WINDOW,
      )
      return { samples, offsetMs: Math.max(...samples) }
    }),
  reset: () => set({ offsetMs: 0, samples: [] }),
}))
