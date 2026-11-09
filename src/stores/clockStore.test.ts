import { beforeEach, describe, expect, it } from 'vitest'
import { useClockStore } from './clockStore'

beforeEach(() => {
  useClockStore.getState().reset()
})

describe('clockStore', () => {
  it('começa sem correção', () => {
    expect(useClockStore.getState().offsetMs).toBe(0)
  })

  it('guarda a diferença medida em cada mensagem', () => {
    useClockStore.getState().syncWithServer(10_000, 12_000)
    expect(useClockStore.getState().offsetMs).toBe(-2000)
  })

  it('fica com a medida de menor latência (a maior diferença)', () => {
    const { syncWithServer } = useClockStore.getState()
    syncWithServer(10_000, 12_300) // chegou 300ms depois
    syncWithServer(20_000, 22_050) // chegou 50ms depois: melhor medida
    syncWithServer(30_000, 32_200)
    expect(useClockStore.getState().offsetMs).toBe(-2050)
  })

  it('esquece medidas antigas (janela de 10)', () => {
    const { syncWithServer } = useClockStore.getState()
    syncWithServer(10_000, 10_000) // diferença 0, logo descartada
    for (let i = 1; i <= 10; i++) syncWithServer(i * 1000, i * 1000 + 500)
    expect(useClockStore.getState().offsetMs).toBe(-500)
  })
})
