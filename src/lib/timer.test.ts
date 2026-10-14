import { describe, expect, it } from 'vitest'
import {
  DRAW_PICK_SECONDS,
  HOURGLASS_TURN_DURATION_SECONDS,
  PREPARATION_SECONDS,
  REMATCH_WINDOW_SECONDS,
  SUDDEN_DEATH_TURN_DURATION_SECONDS,
  TURN_DURATION_SECONDS,
} from '../constants/game'
import {
  estimateClockOffset,
  remainingMs,
  remainingSeconds,
  timerProgress,
  toServerTime,
} from './timer'

const START = 1_000_000

describe('relógio do servidor', () => {
  it('mede a diferença servidor − aparelho', () => {
    expect(estimateClockOffset(10_000, 12_000)).toBe(-2000) // aparelho 2s adiantado
    expect(estimateClockOffset(15_000, 12_000)).toBe(3000) // aparelho 3s atrasado
  })

  it('converte a hora do aparelho na hora do servidor', () => {
    expect(toServerTime(12_000, -2000)).toBe(10_000)
  })
})

describe('remainingMs', () => {
  const turn = { startedAt: START, durationSeconds: 10 }

  it('no meio do turno', () => {
    expect(remainingMs(turn, START + 3500)).toBe(6500)
  })

  it('antes do início (aparelho atrasado) não passa da duração', () => {
    expect(remainingMs(turn, START - 5000)).toBe(10_000)
  })

  it('depois do fim não fica negativo', () => {
    expect(remainingMs(turn, START + 60_000)).toBe(0)
  })

  it('a correção de relógio muda o resultado', () => {
    const clientNow = START + 5000 // o aparelho acha que passaram 5s…
    const offset = -2000 // …mas está 2s adiantado: passaram 3s
    expect(remainingMs(turn, toServerTime(clientNow, offset))).toBe(7000)
  })

  it.each([
    ['turno', TURN_DURATION_SECONDS, 10],
    ['Morte Súbita', SUDDEN_DEATH_TURN_DURATION_SECONDS, 5],
    ['Ampulheta', HOURGLASS_TURN_DURATION_SECONDS, 5],
    ['Preparação', PREPARATION_SECONDS, 20],
    ['sorteio', DRAW_PICK_SECONDS, 8],
    ['revanche', REMATCH_WINDOW_SECONDS, 15],
  ])('suporta a duração de %s (%is)', (_, seconds, expected) => {
    expect(seconds).toBe(expected)
    const deadline = { startedAt: START, durationSeconds: seconds }
    expect(remainingMs(deadline, START)).toBe(seconds * 1000)
    expect(remainingMs(deadline, START + seconds * 500)).toBe(seconds * 500)
    expect(remainingMs(deadline, START + seconds * 1000)).toBe(0)
  })
})

describe('remainingSeconds', () => {
  it('arredonda para cima: 10, 9, … 1 e só 0 no fim', () => {
    expect(remainingSeconds(10_000)).toBe(10)
    expect(remainingSeconds(9_001)).toBe(10)
    expect(remainingSeconds(9_000)).toBe(9)
    expect(remainingSeconds(1)).toBe(1)
    expect(remainingSeconds(0)).toBe(0)
  })
})

describe('timerProgress', () => {
  it('vai de 1 a 0', () => {
    const deadline = { startedAt: START, durationSeconds: 8 }
    expect(timerProgress(deadline, 8000)).toBe(1)
    expect(timerProgress(deadline, 2000)).toBe(0.25)
    expect(timerProgress(deadline, 0)).toBe(0)
  })

  it('duração 0 não divide por zero', () => {
    expect(timerProgress({ startedAt: START, durationSeconds: 0 }, 0)).toBe(0)
  })
})
