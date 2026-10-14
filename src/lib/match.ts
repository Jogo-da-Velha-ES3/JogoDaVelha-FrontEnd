// Regras da melhor de 3 (ERS [RF-ARN-05] [RN-ARN-06]) como funções puras. Quem decide é o
// servidor [RNF-ARQ-02]: aqui elas servem ao servidor simulado (FE-35), aos testes e à exibição
// (ex: "MATCH POINT"). As stores nunca calculam placar ou vencedor com isto.
import { COINS_REWARD, MAX_ROUNDS, ROUNDS_TO_WIN_MATCH } from '../constants/game'
import type { MatchOutcome, PlayerSlot } from '../types/game'

/** Resultado de um round: quem venceu, ou null se empatou (tabuleiro cheio) */
export type RoundResult = PlayerSlot | null

export type Score = Record<PlayerSlot, number>

export type MatchStatus =
  { over: false; nextRound: number; suddenDeath: boolean } | { over: true; outcome: MatchOutcome }

export const otherSlot = (slot: PlayerSlot): PlayerSlot => (slot === 'P1' ? 'P2' : 'P1')

export function scoreOf(results: readonly RoundResult[]): Score {
  return {
    P1: results.filter((r) => r === 'P1').length,
    P2: results.filter((r) => r === 'P2').length,
  }
}

function win(winner: PlayerSlot, score: Score): MatchStatus {
  return { over: true, outcome: { kind: 'WIN', winner, score: [score.P1, score.P2] } }
}

/**
 * Depois de cada round, a partida acaba ou segue?
 * - quem chega a 2 vitórias vence;
 * - empate num dos 2 primeiros rounds + vitória no outro = partida encerrada em 1×0;
 * - round 3 (Morte Súbita) só com 1×1 ou 0×0;
 * - round 3 empatado = empate absoluto, sem mata-mata [RN-ARN-06].
 */
export function matchStatus(results: readonly RoundResult[]): MatchStatus {
  if (results.length === 0) return { over: false, nextRound: 1, suddenDeath: false }
  if (results.length > MAX_ROUNDS) throw new Error(`No máximo ${MAX_ROUNDS} rounds`)

  const score = scoreOf(results)
  const leader: PlayerSlot = score.P1 > score.P2 ? 'P1' : 'P2'

  if (score[leader] >= ROUNDS_TO_WIN_MATCH) return win(leader, score)

  if (results.length === 1) return { over: false, nextRound: 2, suddenDeath: false }

  if (results.length === 2) {
    // Um empate e uma vitória: quem venceu o outro round vence a partida (1×0)
    if (results.includes(null) && score.P1 !== score.P2) return win(leader, score)
    return { over: false, nextRound: 3, suddenDeath: true } // 1×1 ou 0×0
  }

  // Round 3
  const last = results[results.length - 1]
  return last === null ? { over: true, outcome: { kind: 'ABSOLUTE_DRAW' } } : win(last, score)
}

/** Quem começa o round: sorteado no round 1 (pelo servidor), alternando a partir do round 2 */
export function startingPlayer(round: number, firstRoundStarter: PlayerSlot): PlayerSlot {
  return round % 2 === 1 ? firstRoundStarter : otherSlot(firstRoundStarter)
}

/** "MATCH POINT" no início do round: alguém já tem 1 vitória */
export function isMatchPoint(score: Score): boolean {
  return score.P1 >= ROUNDS_TO_WIN_MATCH - 1 || score.P2 >= ROUNDS_TO_WIN_MATCH - 1
}

/** Coins que cada lado recebe no fim da partida [RF-POS-02]. O crédito oficial é do back. */
export function coinsFor(outcome: MatchOutcome, slot: PlayerSlot): number {
  switch (outcome.kind) {
    case 'WIN':
      return outcome.winner === slot ? COINS_REWARD.WIN : COINS_REWARD.LOSS
    case 'ABSOLUTE_DRAW':
      return COINS_REWARD.DRAW
    case 'WO':
      return outcome.winner === slot ? COINS_REWARD.WO_WIN : COINS_REWARD.WO_LOSS
  }
}
