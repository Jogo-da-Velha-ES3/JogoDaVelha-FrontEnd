import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSuddenDeathVibration } from './useVibration'

describe('useSuddenDeathVibration', () => {
  let vibrateSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vibrateSpy = vi.fn<(pattern: VibratePattern) => boolean>()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('não vibra quando não está em Morte Súbita', () => {
    renderHook(() => useSuddenDeathVibration(3, true, false))
    expect(vibrateSpy).not.toHaveBeenCalled()
  })

  it('não vibra quando não é o turno do jogador', () => {
    renderHook(() => useSuddenDeathVibration(3, false, true))
    expect(vibrateSpy).not.toHaveBeenCalled()
  })

  it('não vibra quando remainingSeconds é null', () => {
    renderHook(() => useSuddenDeathVibration(null, true, true))
    expect(vibrateSpy).not.toHaveBeenCalled()
  })

  it('não vibra quando faltam mais de 3 segundos', () => {
    renderHook(() => useSuddenDeathVibration(5, true, true))
    expect(vibrateSpy).not.toHaveBeenCalled()
  })

  it('não vibra quando o tempo acabou (0 segundos)', () => {
    renderHook(() => useSuddenDeathVibration(0, true, true))
    expect(vibrateSpy).not.toHaveBeenCalled()
  })

  it('vibra quando faltam 3 segundos', () => {
    renderHook(() => useSuddenDeathVibration(3, true, true))
    expect(vibrateSpy).toHaveBeenCalledWith(150)
    expect(vibrateSpy).toHaveBeenCalledTimes(1)
  })

  it('vibra quando faltam 2 segundos', () => {
    renderHook(() => useSuddenDeathVibration(2, true, true))
    expect(vibrateSpy).toHaveBeenCalledWith(150)
    expect(vibrateSpy).toHaveBeenCalledTimes(1)
  })

  it('vibra quando falta 1 segundo', () => {
    renderHook(() => useSuddenDeathVibration(1, true, true))
    expect(vibrateSpy).toHaveBeenCalledWith(150)
    expect(vibrateSpy).toHaveBeenCalledTimes(1)
  })

  it('vibra uma vez por segundo (não múltiplas vezes no mesmo segundo)', () => {
    const { rerender } = renderHook(({ seconds }) => useSuddenDeathVibration(seconds, true, true), {
      initialProps: { seconds: 3 },
    })

    // Primeira renderização em 3 segundos
    expect(vibrateSpy).toHaveBeenCalledTimes(1)

    // Re-renderiza no mesmo segundo
    rerender({ seconds: 3 })
    expect(vibrateSpy).toHaveBeenCalledTimes(1) // não vibra novamente

    // Muda para 2 segundos
    rerender({ seconds: 2 })
    expect(vibrateSpy).toHaveBeenCalledTimes(2) // vibra novamente

    // Re-renderiza no mesmo segundo
    rerender({ seconds: 2 })
    expect(vibrateSpy).toHaveBeenCalledTimes(2) // não vibra novamente
  })

  it('não quebra quando navigator.vibrate não existe (iPhone/desktop)', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    expect(() => {
      renderHook(() => useSuddenDeathVibration(3, true, true))
    }).not.toThrow()
  })
})
