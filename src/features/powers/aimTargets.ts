import { ABILITY_INFO } from '../../constants/abilities'
import { BOARD_SIZE } from '../../constants/game'
import type { AbilityId, Cell, PlayerSlot } from '../../types/game'

/** Casas vizinhas, diagonais incluídas conforme regra confirmada pelo back. */
export function adjacentAimCells(index: number, size = BOARD_SIZE): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const result: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr
      const c = col + dc
      if ((dr !== 0 || dc !== 0) && r >= 0 && r < size && c >= 0 && c < size)
        result.push(r * size + c)
    }
  }
  return result
}

const hasShield = (cell: Cell | undefined) =>
  cell?.effects.some((effect) => effect.kind === 'ESCUDO')

const isProtectedFromRemoval = (cell: Cell) =>
  cell.effects.some((effect) => effect.kind === 'REFORCO')

const hasAvailableDestination = (cells: readonly Cell[], index: number) =>
  adjacentAimCells(index, Math.sqrt(cells.length)).some(
    (destination) => cells[destination]?.owner === null && !hasShield(cells[destination]),
  )

/** Alvos legais para a fase atual da mira; nunca altera o tabuleiro nem confirma ações. */
export function getAimTargets(
  cells: readonly Cell[],
  ability: AbilityId,
  player: PlayerSlot,
  selectedCell: number | null,
): number[] {
  const info = ABILITY_INFO[ability]
  if (info.target === 'NONE') return []

  if (info.needsDestination && selectedCell !== null) {
    return adjacentAimCells(selectedCell, Math.sqrt(cells.length)).filter(
      (index) => cells[index]?.owner === null && !hasShield(cells[index]),
    )
  }

  return cells
    .filter((cell) => {
      if (info.target === 'OPPONENT_PIECE') {
        const protectedFromRemoval =
          ability === 'BOMBA' || ability === 'TORNADO' || ability === 'BURACO_NEGRO'
        return (
          cell.owner !== null &&
          cell.owner !== player &&
          (!info.needsDestination || hasAvailableDestination(cells, cell.index)) &&
          !(protectedFromRemoval && isProtectedFromRemoval(cell))
        )
      }
      if (info.target === 'OWN_PIECE') {
        return (
          cell.owner === player &&
          (!info.needsDestination || hasAvailableDestination(cells, cell.index))
        )
      }
      return cell.owner === null && !hasShield(cell)
    })
    .map((cell) => cell.index)
}
