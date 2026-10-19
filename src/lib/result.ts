// Classificação do resultado da partida para a tela de Resultado (FE-15) [RF-POS-01]. Função pura:
// só traduz o que o servidor mandou (outcome e placar) em um tipo de apresentação. Quem decide
// vencedor, placar e Coins é o servidor [RNF-ARQ-02]; nada aqui calcula Coins.
import { ROUNDS_TO_WIN_MATCH } from '../constants/game'
import type { MatchOutcome, PlayerSlot } from '../types/game'
import { otherSlot, type Score } from './match'

export type ResultKind =
  /** Vitória por 2×0 ("VITÓRIA IMPECÁVEL") */
  | 'WIN_FLAWLESS'
  | 'WIN'
  | 'LOSS'
  /** Empate absoluto [RN-ARN-06] */
  | 'DRAW'
  | 'WO_WIN'
  | 'WO_LOSS'

export interface ResultSummary {
  kind: ResultKind
  /** Rounds vencidos por mim */
  mine: number
  /** Rounds vencidos pelo oponente */
  theirs: number
}

/**
 * Tipo de resultado e placar do ponto de vista de `me`. Devolve null enquanto o servidor ainda
 * não mandou o resultado.
 *
 * O placar do WIN vem de `outcome.score`, que o servidor indexa por lado `[P1, P2]` (a validar
 * com o back). Empate e W.O. não trazem placar no `outcome`: usam o placar do momento (`score`).
 */
export function classifyResult(
  outcome: MatchOutcome | null,
  score: Score,
  me: PlayerSlot,
): ResultSummary | null {
  if (outcome === null) return null

  if (outcome.kind === 'WIN') {
    const [p1, p2] = outcome.score
    const mine = me === 'P1' ? p1 : p2
    const theirs = me === 'P1' ? p2 : p1
    if (outcome.winner !== me) return { kind: 'LOSS', mine, theirs }
    const flawless = mine >= ROUNDS_TO_WIN_MATCH && theirs === 0
    return { kind: flawless ? 'WIN_FLAWLESS' : 'WIN', mine, theirs }
  }

  const mine = score[me]
  const theirs = score[otherSlot(me)]
  if (outcome.kind === 'ABSOLUTE_DRAW') return { kind: 'DRAW', mine, theirs }
  return { kind: outcome.winner === me ? 'WO_WIN' : 'WO_LOSS', mine, theirs }
}
