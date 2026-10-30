// Alvos das habilidades: casas vizinhas, casas livres e o que a mira deixa tocar (FE-27). Servem à
// mira da Arena e ao servidor simulado; quem valida a jogada de verdade é o back [RNF-ARQ-02].
import { ABILITY_INFO } from '../constants/abilities'
import { BOARD_SIZE } from '../constants/game'
import type { AbilityId, Cell, CellEffectKind, PlayerSlot } from '../types/game'

const has = (cell: Cell, kind: CellEffectKind) => cell.effects.some((e) => e.kind === kind)

/** Casa vazia e sem Escudo: destino válido para mover uma peça */
export const isFree = (cell: Cell) => cell.owner === null && !has(cell, 'ESCUDO')

/**
 * Casas vizinhas, incluindo as diagonais. A ERS diz só "casa adjacente"; o back confirmou a
 * diagonal em 15/10.
 */
export function adjacentCells(index: number, size = BOARD_SIZE): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const result: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr
      const c = col + dc
      if ((dr || dc) && r >= 0 && r < size && c >= 0 && c < size) result.push(r * size + c)
    }
  }
  return result
}

// O Reforço protege contra remoção e deslocamento, não contra Congelar
const STOPPED_BY_REINFORCEMENT: readonly AbilityId[] = ['BOMBA', 'TORNADO', 'BURACO_NEGRO']

const hasFreeNeighbor = (cells: readonly Cell[], index: number) =>
  adjacentCells(index).some((i) => isFree(cells[i]))

/**
 * Casas que a mira deixa tocar na etapa atual: a peça ou casa alvo e, no Tornado e na Troca
 * Rápida, depois a casa vizinha de destino. Ficam de fora os alvos que só dariam "sem efeito"
 * (peça com Reforço, peça sem vizinha livre), decidido em 29/10.
 */
export function getAimTargets(
  cells: readonly Cell[],
  ability: AbilityId,
  me: PlayerSlot,
  selectedCell: number | null,
): number[] {
  const info = ABILITY_INFO[ability]
  if (info.needsDestination && selectedCell !== null) {
    return adjacentCells(selectedCell).filter((i) => isFree(cells[i]))
  }

  const valid = (cell: Cell): boolean => {
    switch (info.target) {
      case 'NONE':
        return false
      case 'EMPTY_CELL':
        return isFree(cell)
      case 'OWN_PIECE':
        if (cell.owner !== me) return false
        break
      case 'OPPONENT_PIECE':
        if (cell.owner === null || cell.owner === me) return false
        if (STOPPED_BY_REINFORCEMENT.includes(ability) && has(cell, 'REFORCO')) return false
        break
    }
    return !info.needsDestination || hasFreeNeighbor(cells, cell.index)
  }
  return cells.filter(valid).map((cell) => cell.index)
}
