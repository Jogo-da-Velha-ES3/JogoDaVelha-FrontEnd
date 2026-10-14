import type { KeyboardEvent } from 'react'
import type { Cell as CellState, CharacterId, PlayerSlot } from '../../types/game'
import { Cell } from './Cell'

export interface BoardAim {
  /** Casas que podem ser alvo da habilidade em mira */
  targets: readonly number[]
  /** Casa já escolhida (ex: a peça do Tornado, antes do destino) */
  selected?: number
}

export interface BoardProps {
  /** Casas como o servidor manda: dono (P1/P2) e efeitos */
  cells: readonly CellState[]
  /** Personagem de cada lado, para desenhar as peças */
  characters: Partial<Record<PlayerSlot, CharacterId | null>>
  /** Linha vencedora confirmada pelo servidor */
  winningLine?: readonly number[] | null
  aim?: BoardAim | null
  /** Casas clicáveis agora (quem decide é a Arena). Sem isto, todas são */
  selectable?: readonly number[]
  /** Intenção de jogada: o tabuleiro não muda nada, só avisa o índice */
  onCellSelect?: (index: number) => void
  /** Ex: vez do oponente */
  disabled?: boolean
  className?: string
}

// Enquanto o servidor não confirmou os personagens (ex: demonstrações), cada lado usa X ou O
const FALLBACK_CHARACTER: Record<PlayerSlot, CharacterId> = { P1: 'X', P2: 'O' }

const ARROWS: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/**
 * Tabuleiro N×N (4×4 no jogo). Fica quadrado e ocupa o maior quadrado que cabe no espaço
 * do pai, que precisa ter altura definida: no celular deitado, a altura toda.
 */
export function Board({
  cells,
  characters,
  winningLine,
  aim,
  selectable,
  onCellSelect,
  disabled = false,
  className = '',
}: BoardProps) {
  const size = Math.sqrt(cells.length)
  if (!Number.isInteger(size) || size === 0) {
    throw new Error(`Tabuleiro precisa ser quadrado; recebeu ${cells.length} casas`)
  }

  const winning = new Set(winningLine ?? [])
  const allowed = selectable ? new Set(selectable) : null
  const canSelect = (index: number) =>
    onCellSelect !== undefined && !disabled && (allowed === null || allowed.has(index))

  // Setas andam até a próxima casa clicável naquela direção
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta = ARROWS[event.key]
    const from = (event.target as HTMLElement).closest<HTMLElement>('[data-cell]')
    if (!delta || !from) return

    const start = Number(from.dataset.cell)
    let row = Math.floor(start / size) + delta[0]
    let col = (start % size) + delta[1]
    while (row >= 0 && row < size && col >= 0 && col < size) {
      const target = event.currentTarget.querySelector<HTMLButtonElement>(
        `[data-cell="${row * size + col}"] button`,
      )
      if (target) {
        event.preventDefault()
        target.focus()
        return
      }
      row += delta[0]
      col += delta[1]
    }
  }

  const tracks = `repeat(${size}, minmax(0, 1fr))`

  return (
    <div className={`grid size-full place-items-center [container-type:size] ${className}`}>
      <div
        role="group"
        aria-label="Tabuleiro"
        onKeyDown={handleKeyDown}
        className="grid size-[min(100cqw,100cqh)] gap-[2%] rounded-2xl border border-line bg-bg-base p-[2%]"
        style={{ gridTemplateColumns: tracks, gridTemplateRows: tracks }}
      >
        {cells.map((cell, index) => {
          const owner = cell.owner
          const piece = owner ? (characters[owner] ?? FALLBACK_CHARACTER[owner]) : null
          const aimState =
            aim?.selected === index
              ? 'selected'
              : aim?.targets.includes(index)
                ? 'target'
                : undefined

          return (
            <div key={index} data-cell={index} className="min-h-0 min-w-0">
              <Cell
                row={Math.floor(index / size)}
                col={index % size}
                piece={piece}
                effects={cell.effects}
                aim={aimState}
                winning={winning.has(index)}
                onSelect={canSelect(index) ? () => onCellSelect?.(index) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
