import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  VITAO_BUBBLE_SECONDS,
  VITAO_COOLDOWN_SECONDS,
  VITAO_DECISION_WINDOW_MS,
} from '../../constants/game'
import { ABILITY_TEXTS, ARENA_TEXTS } from '../../constants/texts'
import {
  emptyCells,
  initialBoardState,
  useBoardStore,
  type ResolvedAbility,
} from '../../stores/boardStore'
import { INITIAL_MATCH_STATE, useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import type { PlayerSlot, PlayerState } from '../../types/game'
import { useVitaoReactions } from './useVitaoReactions'

const boardWith = (owners: Record<number, PlayerSlot>) =>
  emptyCells().map((cell) => ({ ...cell, owner: owners[cell.index] ?? null }))

const timeout = (player: PlayerSlot) => ({
  player,
  consecutiveTimeouts: 1,
  serverTime: 0,
  receivedAt: 0,
})

const ability = (over: Partial<ResolvedAbility> = {}) =>
  ({
    by: 'P2',
    ability: 'BOMBA',
    absorbed: false,
    noEffect: false,
    serverTime: 0,
    receivedAt: 0,
    ...over,
  }) as ResolvedAbility

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
const waitWindow = () => wait(VITAO_DECISION_WINDOW_MS)

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0)
  useBoardStore.setState(initialBoardState(), true)
  useMatchStore.setState({ ...INITIAL_MATCH_STATE, roundStartedAt: 1000 }, true)
  useRoomStore.setState({ mySlot: 'P1', players: [] })
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
    expect(result.current).toBeNull() // a jogada da pausa foi descartada, não volta depois
    act(() => useBoardStore.setState({ cells: boardWith({ 5: 'P1', 6: 'P2', 7: 'P1' }) }))
    waitWindow()
    expect(result.current).not.toBeNull()
    expect(result.current?.id).not.toBe(firstId) // passaram os 6s: fala de novo
  })

  it('momento grande na pausa de 6s fala na hora, no lugar da fala atual', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useBoardStore.setState({ cells: boardWith({ 5: 'P1' }) }))
    waitWindow()
    const smallId = result.current?.id
    expect(result.current?.moment.kind).toBe('MOVE')

    wait(1000)
    act(() => useMatchStore.setState({ roundEnd: { round: 1, winner: 'P1', winningLine: null } }))
    waitWindow()
    expect(result.current?.moment.kind).toBe('ROUND_END') // sem esperar a pausa acabar
    expect(result.current?.id).not.toBe(smallId)

    // A pausa recomeça na fala grande: o estouro logo depois fica sem fala
    const bigId = result.current?.id
    wait(1000)
    act(() => useMatchStore.setState({ lastTimeout: timeout('P2') }))
    waitWindow()
    expect(result.current?.id).toBe(bigId)
  })

  it('jogada fora do sorteio de 1 em 3 fica sem fala e não gasta a pausa', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useBoardStore.setState({ cells: boardWith({ 5: 'P1' }) }))
    waitWindow()
    expect(result.current).toBeNull()

    wait(1000)
    act(() => useMatchStore.setState({ lastTimeout: timeout('P1') }))
    waitWindow()
    expect(result.current?.moment).toEqual({ kind: 'TIMEOUT', by: 'ME', count: 1 })
  })

  it('estouro do oponente e round empatado: o Vitão fica quieto, o anúncio gravado fala (FE-48)', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useMatchStore.setState({ lastTimeout: timeout('P2') }))
    waitWindow()
    expect(result.current).toBeNull()

    act(() => useMatchStore.setState({ roundEnd: { round: 1, winner: null, winningLine: null } }))
    waitWindow()
    expect(result.current).toBeNull()
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

  it('na entrada da Morte Súbita vira o Diabo e fala a frase gravada do Rafik', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useMatchStore.setState({ suddenDeath: true, introStartedAt: 5000 }))
    waitWindow()
    expect(result.current?.devil).toBe(true)
    expect(result.current?.expression).toBe('DIABO')
    expect(result.current?.text).toBe(ARENA_TEXTS.suddenDeath.line.unfiltered)
    expect(result.current?.audio).toBe('vitao-morte-subita')
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

  it('oponente caiu: o Vitão faz a piada do Rafik que saiu do aviso da Arena', () => {
    const p2 = (connected: boolean): PlayerState => ({
      slot: 'P2',
      userId: 'u-P2',
      nickname: 'P2',
      character: null,
      roundsWon: 0,
      consecutiveTimeouts: 0,
      forceFieldTurnsLeft: 0,
      silenced: false,
      connected,
    })
    useRoomStore.setState({ players: [p2(true)] })
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useRoomStore.setState({ players: [p2(false)] }))
    waitWindow()
    expect(result.current?.moment).toEqual({ kind: 'OPPONENT_DISCONNECTED' })
    expect(result.current?.text).toBe(ARENA_TEXTS.opponentDisconnected.line.unfiltered)
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

  it('habilidade do oponente: fala a frase do Rafik daquela habilidade, com o áudio', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useBoardStore.setState({ lastAbility: ability() }))
    waitWindow()
    expect(result.current?.moment).toEqual({
      kind: 'ABILITY',
      by: 'OPPONENT',
      absorbed: false,
      noEffect: false,
      abilityId: 'BOMBA',
    })
    expect(result.current?.text).toBe(ABILITY_TEXTS.lines.BOMBA.unfiltered)
    expect(result.current?.audio).toBe('vitao-habilidade-bomba')
  })

  it('estouro meu: a fala do Rafik segue o contador (2º estouro)', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useMatchStore.setState({ lastTimeout: { ...timeout('P1'), consecutiveTimeouts: 2 } }))
    waitWindow()
    expect(result.current?.moment).toEqual({ kind: 'TIMEOUT', by: 'ME', count: 2 })
    expect(result.current?.text).toBe(ARENA_TEXTS.timeout.mine(2).unfiltered)
    expect(result.current?.audio).toBe('vitao-tempo-esgotado-2')
  })

  it('match point: o round entra em jogo com alguém na frente', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useMatchStore.setState({ score: { P1: 1, P2: 0 }, introStartedAt: 5000 }))
    waitWindow()
    expect(result.current?.moment).toEqual({ kind: 'MATCH_POINT', leader: 'ME' })
    expect(result.current?.big).toBe(true)
    expect(result.current?.text).toBe(ARENA_TEXTS.roundIntro.matchPointLine(true).unfiltered)
  })

  it('match point com o oponente na frente usa a fala do outro lado', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() => useMatchStore.setState({ score: { P1: 0, P2: 1 }, introStartedAt: 5000 }))
    waitWindow()
    expect(result.current?.moment).toEqual({ kind: 'MATCH_POINT', leader: 'OPPONENT' })
    expect(result.current?.text).toBe(ARENA_TEXTS.roundIntro.matchPointLine(false).unfiltered)
  })

  it('na Morte Súbita não tem match point: só a entrada', () => {
    const { result } = renderHook(() => useVitaoReactions())
    act(() =>
      useMatchStore.setState({ suddenDeath: true, score: { P1: 1, P2: 0 }, introStartedAt: 5000 }),
    )
    waitWindow()
    expect(result.current?.moment).toEqual({ kind: 'SUDDEN_DEATH_START' })
  })
})
