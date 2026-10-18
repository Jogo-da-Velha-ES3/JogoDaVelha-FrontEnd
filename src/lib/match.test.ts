import { describe, expect, it } from 'vitest'
import type { MatchOutcome } from '../types/game'
import { coinsFor, isMatchPoint, matchStatus, type RoundResult, startingPlayer } from './match'

const win = (winner: 'P1' | 'P2', p1: number, p2: number) => ({
  over: true,
  outcome: { kind: 'WIN', winner, score: [p1, p2] },
})
const next = (nextRound: number, suddenDeath = false) => ({ over: false, nextRound, suddenDeath })

describe('matchStatus — melhor de 3 (regra de 18/10)', () => {
  it.each<[string, RoundResult[], object]>([
    ['antes do 1º round', [], next(1)],
    ['vitória no round 1 segue', ['P1'], next(2)],
    ['empate no round 1 segue', [null], next(2)],
    ['2×0 encerra no round 2', ['P1', 'P1'], win('P1', 2, 0)],
    ['1×1 vai para a Morte Súbita', ['P1', 'P2'], next(3, true)],
    ['0×0 (dois empates) vai para a Morte Súbita', [null, null], next(3, true)],
    ['empate + vitória (1×0) vai para a Morte Súbita', [null, 'P2'], next(3, true)],
    ['vitória + empate (1×0) vai para a Morte Súbita', ['P1', null], next(3, true)],
    ['1×1 e vitória na Morte Súbita = 2×1', ['P1', 'P2', 'P2'], win('P2', 1, 2)],
    ['1×0 e quem está na frente vence de novo = 2×0', ['P1', null, 'P1'], win('P1', 2, 0)],
    ['1×0 e a Morte Súbita empata: vence quem está na frente', ['P1', null, null], win('P1', 1, 0)],
    ['0×0 e vitória na Morte Súbita = 1×0', [null, null, 'P1'], win('P1', 1, 0)],
  ])('%s', (_, results, expected) => {
    expect(matchStatus(results)).toEqual(expected)
  })

  it.each<[string, RoundResult[]]>([
    ['1×1 e a Morte Súbita empata', ['P1', 'P2', null]],
    ['0×0 e a Morte Súbita empata', [null, null, null]],
    ['1×0 e quem está atrás vence a Morte Súbita (1×1)', ['P1', null, 'P2']],
    ['empate + vitória e quem está atrás vence a Morte Súbita (1×1)', [null, 'P2', 'P1']],
  ])('empate absoluto: %s [RN-ARN-06]', (_, results) => {
    expect(matchStatus(results)).toEqual({ over: true, outcome: { kind: 'ABSOLUTE_DRAW' } })
  })

  it('não existe round 4 (sem mata-mata)', () => {
    expect(() => matchStatus(['P1', 'P2', null, 'P1'])).toThrow(/3 rounds/)
  })
})

describe('startingPlayer', () => {
  it('round 1 é o sorteado e depois alterna', () => {
    expect([1, 2, 3].map((r) => startingPlayer(r, 'P2'))).toEqual(['P2', 'P1', 'P2'])
    expect([1, 2, 3].map((r) => startingPlayer(r, 'P1'))).toEqual(['P1', 'P2', 'P1'])
  })
})

describe('isMatchPoint', () => {
  it('alguém já tem 1 vitória', () => {
    expect(isMatchPoint({ P1: 0, P2: 0 })).toBe(false)
    expect(isMatchPoint({ P1: 1, P2: 0 })).toBe(true)
    expect(isMatchPoint({ P1: 1, P2: 1 })).toBe(true)
  })
})

describe('coinsFor [RF-POS-02]', () => {
  it.each<[string, MatchOutcome, number, number]>([
    ['vitória', { kind: 'WIN', winner: 'P1', score: [2, 0] }, 50, 10],
    ['empate absoluto', { kind: 'ABSOLUTE_DRAW' }, 20, 20],
    ['W.O.', { kind: 'WO', winner: 'P1' }, 30, 0],
  ])('%s: P1 recebe %i, P2 recebe %i', (_, outcome, p1, p2) => {
    expect(coinsFor(outcome, 'P1')).toBe(p1)
    expect(coinsFor(outcome, 'P2')).toBe(p2)
  })
})
