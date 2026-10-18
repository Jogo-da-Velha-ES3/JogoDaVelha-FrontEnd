// Textos da tela de Resultado, num lugar só (FE-15). A FE-40 (voz do jogo) vai centralizar os
// textos da interface; quando existir, estes migram para lá. Os títulos ficam em caixa normal e
// o CSS põe em maiúsculas, como nos outros anúncios (ex: "Empate absoluto" no Banner).
import type { ResultKind, ResultSummary } from '../../lib/result'

export const RESULT_TITLES: Record<ResultKind, string> = {
  WIN_FLAWLESS: 'Vitória impecável', // só o 2×0 [RF-POS-01]
  WIN: 'Vitória',
  LOSS: 'Derrota',
  DRAW: 'Empate absoluto',
  WO_WIN: 'Vitória por W.O.',
  WO_LOSS: 'Derrota por W.O.',
}

/**
 * Linha de apoio abaixo do título. Os dois W.O. repetem o texto do banner da Arena (PROJECT_CONTEXT
 * §9). O empate usa o placar, porque a regra de 18/10 também empata por 1×1 em que o round 3 teve
 * vencedor, então "o round 3 terminou sem vencedor" (esboço) nem sempre é verdade.
 */
export function resultSubtitle({ kind, mine, theirs }: ResultSummary): string | null {
  switch (kind) {
    case 'WO_WIN':
      return 'O oponente esgotou o tempo 3 vezes'
    case 'WO_LOSS':
      return '3 tempos esgotados seguidos'
    case 'DRAW':
      return `Placar final ${mine} × ${theirs}`
    default:
      return null
  }
}
