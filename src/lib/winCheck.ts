// Verificação de vitória N×N com K em linha. A vitória oficial é decidida pelo back [RNF-ARQ-02];
// isto serve para testes, demonstrações, o servidor simulado e destacar a linha vencedora.
import { WIN_LENGTH } from '../constants/game'
import type { Cell, PlayerSlot } from '../types/game'

export type BoardEvaluation =
  { kind: 'WIN'; winner: PlayerSlot; line: number[] } | { kind: 'DRAW' } | null

// Linha, coluna, diagonal e diagonal invertida
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const

const linesCache = new Map<string, readonly (readonly number[])[]>()

/** Todas as linhas de `length` casas seguidas num tabuleiro `size × size` (índices de 0 a size²−1) */
export function winningLines(size: number, length: number): readonly (readonly number[])[] {
  const key = `${size}:${length}`
  const cached = linesCache.get(key)
  if (cached) return cached

  const lines: number[][] = []
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const [dRow, dCol] of DIRECTIONS) {
        const endRow = row + dRow * (length - 1)
        const endCol = col + dCol * (length - 1)
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue
        lines.push(Array.from({ length }, (_, i) => (row + dRow * i) * size + col + dCol * i))
      }
    }
  }

  linesCache.set(key, lines)
  return lines
}

function boardSize(board: readonly Cell[]): number {
  const size = Math.sqrt(board.length)
  if (!Number.isInteger(size) || size === 0) {
    throw new Error(`Tabuleiro precisa ser quadrado; recebeu ${board.length} casas`)
  }
  return size
}

/** Peça congelada continua na casa, mas não conta para a vitória [RN-ARN-08] */
function countsFor(cell: Cell, player: PlayerSlot): boolean {
  return cell.owner === player && !cell.effects.some((effect) => effect.kind === 'CONGELAR')
}

/**
 * Casas da linha vencedora do jogador (posições no array, na ordem da linha), ou null.
 * O tamanho do tabuleiro vem do número de casas (16 = 4×4).
 */
export function findWinningLine(
  board: readonly Cell[],
  player: PlayerSlot,
  length = WIN_LENGTH,
): number[] | null {
  const line = winningLines(boardSize(board), length).find((candidate) =>
    candidate.every((index) => countsFor(board[index], player)),
  )
  return line ? [...line] : null
}

/**
 * Resultado do round depois de uma ação de `actor`: verifica primeiro quem agiu e depois o
 * oponente [RN-ARN-08]. Tabuleiro cheio sem linha é empate [RF-ARN-04]; senão, o jogo segue (null).
 */
export function evaluateBoard(
  board: readonly Cell[],
  actor: PlayerSlot,
  length = WIN_LENGTH,
): BoardEvaluation {
  const opponent: PlayerSlot = actor === 'P1' ? 'P2' : 'P1'

  for (const player of [actor, opponent]) {
    const line = findWinningLine(board, player, length)
    if (line) return { kind: 'WIN', winner: player, line }
  }

  return board.every((cell) => cell.owner !== null) ? { kind: 'DRAW' } : null
}
