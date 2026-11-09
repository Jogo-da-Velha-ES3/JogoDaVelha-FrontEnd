import { useState } from 'react'
import { Button } from '../../components/ui'
import { BOARD_CELLS } from '../../constants/game'
import { Board } from '../../features/board'
import { evaluateBoard } from '../../lib/winCheck'
import type { Cell, PlayerSlot } from '../../types/game'
import { ShowcaseBlock } from './ShowcaseLayout'

const emptyBoard = (): Cell[] =>
  Array.from({ length: BOARD_CELLS }, (_, index) => ({ index, owner: null, effects: [] }))

// Demonstração do tabuleiro (FE-03). O estado local fica aqui, na vitrine: no jogo, as casas
// vêm do servidor e o Board só emite a intenção.
export function BoardShowcase() {
  const [cells, setCells] = useState(emptyBoard)
  const [turn, setTurn] = useState<PlayerSlot>('P1')
  const [lastActor, setLastActor] = useState<PlayerSlot>('P2')

  const result = evaluateBoard(cells, lastActor)
  const empty = cells.filter((c) => c.owner === null).map((c) => c.index)

  const play = (index: number) => {
    setCells((prev) => prev.map((c) => (c.index === index ? { ...c, owner: turn } : c)))
    setLastActor(turn)
    setTurn(turn === 'P1' ? 'P2' : 'P1')
  }

  const reset = () => {
    setCells(emptyBoard())
    setTurn('P1')
    setLastActor('P2')
  }

  const status =
    result?.kind === 'WIN'
      ? `Vitória do ${result.winner}`
      : result?.kind === 'DRAW'
        ? 'Empate'
        : `Vez do ${turn}`

  return (
    <ShowcaseBlock
      title="Tabuleiro jogável"
      hint="Toque nas casas para alternar as peças do P1 e do P2. Ao alinhar 4, a linha vencedora acende. A caixa tem a altura de um celular deitado."
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-[340px] w-full max-w-[520px] rounded-xl border border-dashed border-line p-2">
          <Board
            cells={cells}
            characters={{ P1: 'X', P2: 'ESTRELA' }}
            winningLine={result?.kind === 'WIN' ? result.line : null}
            selectable={empty}
            onCellSelect={play}
            disabled={result !== null}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-display text-xl font-bold uppercase">{status}</p>
          <Button variant="secondary" size="sm" onClick={reset}>
            Reiniciar
          </Button>
          <p className="max-w-56 font-mono text-xs text-text-muted">
            Caixa de 340px de altura, como o celular deitado: o tabuleiro ocupa a altura toda.
          </p>
        </div>
      </div>
    </ShowcaseBlock>
  )
}
