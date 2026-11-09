import { describe, expect, it } from 'vitest'
import type { MatchOutcome, PlayerSlot } from '../types/game'
import type { Score } from './match'
import { classifyResult, type ResultSummary } from './result'

const win = (winner: PlayerSlot, p1: number, p2: number): MatchOutcome => ({
  kind: 'WIN',
  winner,
  score: [p1, p2],
})
const NO_SCORE: Score = { P1: 0, P2: 0 }

describe('classifyResult', () => {
  it.each<[string, MatchOutcome, PlayerSlot, ResultSummary]>([
    [
      '2×0 para mim é vitória impecável',
      win('P1', 2, 0),
      'P1',
      { kind: 'WIN_FLAWLESS', mine: 2, theirs: 0 },
    ],
    ['2×0 para mim sendo P2', win('P2', 0, 2), 'P2', { kind: 'WIN_FLAWLESS', mine: 2, theirs: 0 }],
    ['2×1 é vitória comum', win('P1', 2, 1), 'P1', { kind: 'WIN', mine: 2, theirs: 1 }],
    [
      '1×0 (por empates) é vitória comum, não impecável',
      win('P1', 1, 0),
      'P1',
      { kind: 'WIN', mine: 1, theirs: 0 },
    ],
    [
      '0×2 é derrota (sem "impecável" para quem perde)',
      win('P2', 0, 2),
      'P1',
      { kind: 'LOSS', mine: 0, theirs: 2 },
    ],
    ['1×2 é derrota', win('P2', 1, 2), 'P1', { kind: 'LOSS', mine: 1, theirs: 2 }],
    ['0×1 é derrota', win('P2', 0, 1), 'P1', { kind: 'LOSS', mine: 0, theirs: 1 }],
    [
      'o placar do WIN é lido por lado: P2 perdendo 2×1',
      win('P1', 2, 1),
      'P2',
      { kind: 'LOSS', mine: 1, theirs: 2 },
    ],
  ])('%s', (_, outcome, me, expected) => {
    expect(classifyResult(outcome, NO_SCORE, me)).toEqual(expected)
  })

  it('empate absoluto usa o placar do momento (1×1 e 0×0)', () => {
    const draw: MatchOutcome = { kind: 'ABSOLUTE_DRAW' }
    expect(classifyResult(draw, { P1: 1, P2: 1 }, 'P1')).toEqual({
      kind: 'DRAW',
      mine: 1,
      theirs: 1,
    })
    expect(classifyResult(draw, { P1: 0, P2: 0 }, 'P2')).toEqual({
      kind: 'DRAW',
      mine: 0,
      theirs: 0,
    })
  })

  it('W.O. ganho e perdido usam o placar do momento, do meu ponto de vista', () => {
    const score: Score = { P1: 1, P2: 0 }
    expect(classifyResult({ kind: 'WO', winner: 'P1' }, score, 'P1')).toEqual({
      kind: 'WO_WIN',
      mine: 1,
      theirs: 0,
    })
    expect(classifyResult({ kind: 'WO', winner: 'P1' }, score, 'P2')).toEqual({
      kind: 'WO_LOSS',
      mine: 0,
      theirs: 1,
    })
  })

  it('sem resultado do servidor ainda, não classifica', () => {
    expect(classifyResult(null, { P1: 2, P2: 0 }, 'P1')).toBeNull()
  })
})
