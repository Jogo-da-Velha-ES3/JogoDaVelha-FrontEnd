// Geometria e tempo dos efeitos das habilidades (FE-47): onde fica cada casa no grid do tabuleiro,
// quanto uma peça anda para ir de uma casa a outra e os trechos da animação. Sem React, para o
// Board, os efeitos e os testes usarem.
import type { Easing, Transition } from 'framer-motion'
import { ABILITY_IMPACT_SECONDS } from '../../../constants/game'
import type { ResolvedAbility } from '../../../stores/boardStore'
import type { AbilityId } from '../../../types/game'

/**
 * Trecho da animação em frações da duração do efeito (ABILITY_IMPACT_SECONDS). Ex: `span(0.3, 0.6)`
 * começa em 30% e termina em 60% do efeito
 */
export const span = (from: number, to: number, ease: Easing = 'easeOut'): Transition => ({
  delay: from * ABILITY_IMPACT_SECONDS,
  duration: (to - from) * ABILITY_IMPACT_SECONDS,
  ease,
})

/** Espaço entre as casas, em % da largura do tabuleiro (o `gap` do grid do Board) */
export const BOARD_GAP_PERCENT = 2

/** Casa no grid do tabuleiro, com linha e coluna a partir de 1, como no CSS */
export interface GridCell {
  row: number
  col: number
}

export const gridCell = (index: number, size: number): GridCell => ({
  row: Math.floor(index / size) + 1,
  col: (index % size) + 1,
})

/**
 * Quanto a peça anda para chegar à casa vizinha, em % da própria casa: a casa mais o espaço entre
 * elas. No 4×4 com 2% de espaço, cada casa tem 23,5% do tabuleiro e o passo é ~108,5%.
 */
export function cellStepPercent(size: number, gap = BOARD_GAP_PERCENT): number {
  const cell = (100 - (size - 1) * gap) / size
  return ((cell + gap) / cell) * 100
}

/** Deslocamento de uma casa até outra, para o `x`/`y` do Framer (em % da casa) */
export const offsetBetween = (from: GridCell, to: GridCell, step: number) => ({
  x: `${(to.col - from.col) * step}%`,
  y: `${(to.row - from.row) * step}%`,
})

const MOVES: readonly AbilityId[] = ['TORNADO', 'BURACO_NEGRO', 'TROCA_RAPIDA']

/**
 * A habilidade levou uma peça de uma casa para outra. O tabuleiro já chega com a peça no destino,
 * então ela fica escondida lá até a animação terminar de levá-la
 */
export const movesPiece = (result: ResolvedAbility) =>
  MOVES.includes(result.ability) &&
  !result.absorbed &&
  !result.noEffect &&
  result.targetCell !== null &&
  result.destinationCell !== null
