import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as suddenDeathSounds from '../audio/suddenDeathSounds'
import { useSuddenDeathSounds } from './useSuddenDeathSounds'

describe('useSuddenDeathSounds', () => {
  let startMusicSpy: ReturnType<typeof vi.spyOn>
  let stopMusicSpy: ReturnType<typeof vi.spyOn>
  let playSirenSpy: ReturnType<typeof vi.spyOn>
  let startHeartbeatSpy: ReturnType<typeof vi.spyOn>
  let stopHeartbeatSpy: ReturnType<typeof vi.spyOn>
  let startTickTockSpy: ReturnType<typeof vi.spyOn>
  let stopTickTockSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    startMusicSpy = vi.spyOn(suddenDeathSounds, 'startSuddenDeathMusic')
    stopMusicSpy = vi.spyOn(suddenDeathSounds, 'stopSuddenDeathMusic')
    playSirenSpy = vi.spyOn(suddenDeathSounds, 'playSuddenDeathSiren')
    startHeartbeatSpy = vi.spyOn(suddenDeathSounds, 'startHeartbeat')
    stopHeartbeatSpy = vi.spyOn(suddenDeathSounds, 'stopHeartbeat')
    startTickTockSpy = vi.spyOn(suddenDeathSounds, 'startTickTock')
    stopTickTockSpy = vi.spyOn(suddenDeathSounds, 'stopTickTock')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('não dispara nada quando não está em Morte Súbita', () => {
    renderHook(() => useSuddenDeathSounds(false, 5, true))

    expect(startMusicSpy).not.toHaveBeenCalled()
    expect(playSirenSpy).not.toHaveBeenCalled()
    expect(startHeartbeatSpy).not.toHaveBeenCalled()
    expect(startTickTockSpy).not.toHaveBeenCalled()
  })

  it('dispara trilha, sirene e batida de coração na entrada da Morte Súbita', () => {
    renderHook(() => useSuddenDeathSounds(true, 5, true))

    expect(startMusicSpy).toHaveBeenCalledTimes(1)
    expect(playSirenSpy).toHaveBeenCalledTimes(1)
    expect(startHeartbeatSpy).toHaveBeenCalledTimes(1)
  })

  it('não dispara sons de entrada múltiplas vezes por re-render', () => {
    const { rerender } = renderHook(({ seconds }) => useSuddenDeathSounds(true, seconds, true), {
      initialProps: { seconds: 5 },
    })

    expect(startMusicSpy).toHaveBeenCalledTimes(1)
    expect(playSirenSpy).toHaveBeenCalledTimes(1)
    expect(startHeartbeatSpy).toHaveBeenCalledTimes(1)

    // Re-render com diferentes segundos
    rerender({ seconds: 4 })
    rerender({ seconds: 3 })
    rerender({ seconds: 2 })

    // Sons de entrada não devem disparar novamente
    expect(startMusicSpy).toHaveBeenCalledTimes(1)
    expect(playSirenSpy).toHaveBeenCalledTimes(1)
    expect(startHeartbeatSpy).toHaveBeenCalledTimes(1)
  })

  it('para todos os sons ao desmontar', () => {
    const { unmount } = renderHook(() => useSuddenDeathSounds(true, 5, true))

    unmount()

    expect(stopMusicSpy).toHaveBeenCalledTimes(1)
    expect(stopHeartbeatSpy).toHaveBeenCalledTimes(1)
    expect(stopTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('para todos os sons ao sair da Morte Súbita', () => {
    const { rerender } = renderHook(({ sd }) => useSuddenDeathSounds(sd, 5, true), {
      initialProps: { sd: true },
    })

    // Muda para não-Morte Súbita
    rerender({ sd: false })

    expect(stopMusicSpy).toHaveBeenCalledTimes(1)
    expect(stopHeartbeatSpy).toHaveBeenCalledTimes(1)
    expect(stopTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('inicia tique-taque quando faltam 3 segundos', () => {
    renderHook(() => useSuddenDeathSounds(true, 3, true))

    expect(startTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('inicia tique-taque quando faltam 2 segundos', () => {
    renderHook(() => useSuddenDeathSounds(true, 2, true))

    expect(startTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('inicia tique-taque quando falta 1 segundo', () => {
    renderHook(() => useSuddenDeathSounds(true, 1, true))

    expect(startTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('não inicia tique-taque quando faltam mais de 3 segundos', () => {
    renderHook(() => useSuddenDeathSounds(true, 5, true))

    expect(startTickTockSpy).not.toHaveBeenCalled()
  })

  it('não inicia tique-taque quando o tempo acabou (0 segundos)', () => {
    renderHook(() => useSuddenDeathSounds(true, 0, true))

    expect(startTickTockSpy).not.toHaveBeenCalled()
  })

  it('para tique-taque quando sai da faixa de 3 segundos', () => {
    const { rerender } = renderHook(({ seconds }) => useSuddenDeathSounds(true, seconds, true), {
      initialProps: { seconds: 3 },
    })

    expect(startTickTockSpy).toHaveBeenCalledTimes(1)

    // Sai da faixa de 3 segundos
    rerender({ seconds: 4 })

    expect(stopTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('não inicia tique-taque múltiplas vezes na mesma faixa de 3 segundos', () => {
    const { rerender } = renderHook(({ seconds }) => useSuddenDeathSounds(true, seconds, true), {
      initialProps: { seconds: 3 },
    })

    expect(startTickTockSpy).toHaveBeenCalledTimes(1)

    // Muda dentro da faixa de 3 segundos
    rerender({ seconds: 2 })
    rerender({ seconds: 1 })

    // Não deve iniciar novamente
    expect(startTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('não inicia tique-taque quando não está em fase PLAYING', () => {
    renderHook(() => useSuddenDeathSounds(true, 3, false))

    expect(startTickTockSpy).not.toHaveBeenCalled()
  })

  it('para tique-taque quando sai da fase PLAYING', () => {
    const { rerender } = renderHook(({ playing }) => useSuddenDeathSounds(true, 3, playing), {
      initialProps: { playing: true },
    })

    expect(startTickTockSpy).toHaveBeenCalledTimes(1)

    // Sai da fase PLAYING (ex: vai para ROUND_END)
    rerender({ playing: false })

    expect(stopTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('tique-taque funciona para turno do oponente também (não só do jogador)', () => {
    // O hook não distingue entre turno próprio ou do oponente
    renderHook(() => useSuddenDeathSounds(true, 2, true))

    expect(startTickTockSpy).toHaveBeenCalledTimes(1)
  })

  it('para tique-taque quando remainingSeconds vira null', () => {
    const { rerender } = renderHook(({ seconds }) => useSuddenDeathSounds(true, seconds, true), {
      initialProps: { seconds: 2 as number | null },
    })

    expect(startTickTockSpy).toHaveBeenCalledTimes(1)

    // remainingSeconds vira null (sem turno ativo)
    rerender({ seconds: null })

    expect(stopTickTockSpy).toHaveBeenCalledTimes(1)
  })
})
