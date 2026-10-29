import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  VITAO_BUBBLE_SECONDS,
  VITAO_COOLDOWN_SECONDS,
  VITAO_DECISION_WINDOW_MS,
} from '../../constants/game'
import { emptyCells, initialBoardState, useBoardStore } from '../../stores/boardStore'
import { INITIAL_MATCH_STATE, useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import type { PlayerSlot } from '../../types/game'
import { useVitaoReactions } from './useVitaoReactions'

const boardWith = (owners: Record<number, PlayerSlot>) =>
  emptyCells().map((cell) => ({ ...cell, owner: owners[cell.index] ?? null }))

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
const waitWindow = () => wait(VITAO_DECISION_WINDOW_MS)

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0)
  useBoardStore.setState(initialBoardState(), true)
  useMatchStore.setState({ ...INITIAL_MATCH_STATE, roundStartedAt: 1000 }, true)
  useRoomStore.setState({ mySlot: 'P1' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useVitaoReactions', () => {
  it('reage só depois da janela de decisão, e a fala some sozinha', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useBoardStore.setState({ cells: boardWith({ 5: 'P1' }) }))
    expect(result.current).toBeNull()

    waitWindow()
    expect(result.current?.moment.kind).toBe('MOVE')

    wait(VITAO_BUBBLE_SECONDS * 1000)
    expect(result.current).toBeNull()
  })

  it('no máximo 1 fala a cada 6s', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useBoardStore.setState({ cells: boardWith({ 5: 'P1' }) }))
    waitWindow()
    const firstId = result.current?.id
    expect(firstId).toBeDefined()

    wait(1000)
    act(() => useBoardStore.setState({ cells: boardWith({ 5: 'P1', 6: 'P2' }) }))
    waitWindow()
    expect(result.current?.id).toBe(firstId) // dentro dos 6s: calado

    wait(VITAO_COOLDOWN_SECONDS * 1000)
    act(() => useBoardStore.setState({ cells: boardWith({ 5: 'P1', 6: 'P2', 7: 'P1' }) }))
    waitWindow()
    expect(result.current).not.toBeNull()
    expect(result.current?.id).not.toBe(firstId) // passaram os 6s: fala de novo
  })

  it('o momento grande ganha da jogada que chegou junto', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => {
      useBoardStore.setState({ cells: boardWith({ 5: 'P1' }) })
      useMatchStore.setState({ roundEnd: { round: 1, winner: 'P1', winningLine: null } })
    })
    waitWindow()
    expect(result.current?.moment.kind).toBe('ROUND_END')
    expect(result.current?.big).toBe(true)
  })

  it('na entrada da Morte Súbita vira o Diabo', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useMatchStore.setState({ suddenDeath: true, introStartedAt: 5000 }))
    waitWindow()
    expect(result.current?.devil).toBe(true)
    expect(result.current?.expression).toBe('DIABO')
  })

  it('tabuleiro recarregado por reconexão não vira jogada', () => {
    useMatchStore.setState({ roundStartedAt: null }) // snapshot: sem ROUND_START
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useBoardStore.setState({ cells: boardWith({ 5: 'P2' }) }))
    waitWindow()
    expect(result.current).toBeNull()

    act(() => useBoardStore.setState({ cells: boardWith({ 1: 'P1', 2: 'P2', 3: 'P1' }) }))
    waitWindow()
    expect(result.current).toBeNull()
  })

  it('W.O. reage uma vez; repetido não reage de novo', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() =>
      useMatchStore.setState({ outcome: { kind: 'WO', winner: 'P2' }, outcomeReceivedAt: 2000 }),
    )
    waitWindow()
    expect(result.current?.moment).toEqual({ kind: 'WO', winner: 'OPPONENT' })

    wait(VITAO_COOLDOWN_SECONDS * 1000)
    expect(result.current).toBeNull()
    act(() => useMatchStore.setState({ outcome: { kind: 'WO', winner: 'P2' } })) // mesma hora
    waitWindow()
    expect(result.current).toBeNull()
  })
})
