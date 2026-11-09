import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_MATCH_STATE, useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import type { RoomPhase } from '../../types/game'
import { playMusic, stopAllMusic } from './soundManager'
import { useRoomMusic } from './useRoomMusic'

vi.mock('./soundManager', () => ({
  playMusic: vi.fn<(key: string) => void>(),
  stopAllMusic: vi.fn<() => void>(),
}))

const setPhase = (phase: RoomPhase | null) => act(() => useRoomStore.setState({ phase }))
const played = () => vi.mocked(playMusic).mock.calls.map(([key]) => key)

beforeEach(() => {
  useRoomStore.setState({ phase: null })
  useMatchStore.setState(INITIAL_MATCH_STATE)
})

afterEach(() => vi.clearAllMocks())

describe('useRoomMusic (FE-38)', () => {
  it('sem fase (entrando na sala), não mexe na trilha que já toca', () => {
    renderHook(() => useRoomMusic())

    expect(playMusic).not.toHaveBeenCalled()
    expect(stopAllMusic).not.toHaveBeenCalled()
  })

  it('partida inteira: Sala, Arena, Morte Súbita e Resultado sem trilha', () => {
    renderHook(() => useRoomMusic())

    setPhase('WAITING')
    setPhase('DRAFT')
    setPhase('VERSUS')
    setPhase('PLAYING')
    setPhase('ROUND_END') // mesma trilha: não chama o motor de novo
    act(() => useMatchStore.setState({ suddenDeath: true }))
    setPhase('PLAYING')
    setPhase('RESULT')

    expect(played()).toEqual(['trilha-sala', 'trilha-arena', 'trilha-morte-subita'])
    expect(stopAllMusic).toHaveBeenCalledTimes(1)
  })

  it('revanche aceita: do Resultado volta para a trilha da Sala', () => {
    renderHook(() => useRoomMusic())
    setPhase('RESULT')

    setPhase('DRAFT')

    expect(played()).toEqual(['trilha-sala'])
  })
})
