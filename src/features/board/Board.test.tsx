import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Cell, PlayerSlot } from '../../types/game'
import { Board } from './Board'

/** 16 casas a partir de texto: X = P1, O = P2, . = vazia */
function cells(rows: string): Cell[] {
  return rows
    .replaceAll('/', '')
    .split('')
    .map((char, index) => ({
      index,
      owner: (char === 'X' ? 'P1' : char === 'O' ? 'P2' : null) as PlayerSlot | null,
      effects: [],
    }))
}

const EMPTY = cells('..../..../..../....')
const CHARACTERS = { P1: 'TRIANGULO', P2: 'CORACAO' } as const

describe('Board', () => {
  it('renderiza as 16 casas dentro do grupo "Tabuleiro"', () => {
    render(<Board cells={EMPTY} characters={CHARACTERS} />)
    const board = screen.getByRole('group', { name: 'Tabuleiro' })
    expect(within(board).getAllByRole('img')).toHaveLength(16)
  })

  it('desenha a peça com o personagem de cada lado', () => {
    render(<Board cells={cells('XO../..../..../....')} characters={CHARACTERS} />)
    expect(screen.getByRole('img', { name: 'Linha 1, coluna 1: Triângulo' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Linha 1, coluna 2: Coração' })).toBeInTheDocument()
  })

  it('sem personagem confirmado, usa X para o P1 e O para o P2', () => {
    render(<Board cells={cells('XO../..../..../....')} characters={{}} />)
    expect(screen.getByRole('img', { name: 'Linha 1, coluna 1: X' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Linha 1, coluna 2: O' })).toBeInTheDocument()
  })

  it('marca a linha vencedora e a mira', () => {
    render(
      <Board
        cells={cells('XXXX/O.../O.../....')}
        characters={CHARACTERS}
        winningLine={[0, 1, 2, 3]}
        aim={{ targets: [4, 8], selected: 8 }}
      />,
    )
    expect(screen.getAllByRole('img', { name: /linha vencedora/ })).toHaveLength(4)
    expect(
      screen.getByRole('img', { name: /Linha 2, coluna 1.*alvo possível/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Linha 3, coluna 1.*alvo escolhido/ }),
    ).toBeInTheDocument()
  })

  it('clique emite a intenção com o índice e não muda o tabuleiro', async () => {
    const onCellSelect = vi.fn<(index: number) => void>()
    render(<Board cells={EMPTY} characters={CHARACTERS} onCellSelect={onCellSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Linha 2, coluna 3: vazia' }))

    expect(onCellSelect).toHaveBeenCalledWith(6)
    expect(screen.getByRole('button', { name: 'Linha 2, coluna 3: vazia' })).toBeInTheDocument()
  })

  it('só as casas de `selectable` ficam clicáveis', () => {
    render(
      <Board cells={EMPTY} characters={CHARACTERS} selectable={[0, 15]} onCellSelect={() => {}} />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveAccessibleName('Linha 1, coluna 1: vazia')
    expect(buttons[1]).toHaveAccessibleName('Linha 4, coluna 4: vazia')
  })

  it('desabilitado (vez do oponente) não tem casa clicável', () => {
    render(<Board cells={EMPTY} characters={CHARACTERS} onCellSelect={() => {}} disabled />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('setas movem o foco entre casas clicáveis, pulando as que não são', async () => {
    render(
      <Board
        cells={EMPTY}
        characters={CHARACTERS}
        selectable={[0, 1, 3, 4]}
        onCellSelect={() => {}}
      />,
    )
    const name = (row: number, col: number) => `Linha ${row}, coluna ${col}: vazia`
    screen.getByRole('button', { name: name(1, 1) }).focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: name(1, 2) })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}') // pula a coluna 3, que não é clicável
    expect(screen.getByRole('button', { name: name(1, 4) })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}') // borda: fica onde está
    expect(screen.getByRole('button', { name: name(1, 4) })).toHaveFocus()

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowDown}')
    expect(screen.getByRole('button', { name: name(2, 1) })).toHaveFocus()
  })

  it('casas que não formam um quadrado dão erro', () => {
    expect(() => render(<Board cells={EMPTY.slice(0, 15)} characters={CHARACTERS} />)).toThrow(
      /quadrado/,
    )
  })
})
