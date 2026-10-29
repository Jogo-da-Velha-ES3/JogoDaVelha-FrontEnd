import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CHARACTER_INFO } from '../../constants/characters'
import { Cell } from './Cell'

const layer = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-layer="${name}"]`)

describe('Cell', () => {
  it('casa vazia descreve a posição', () => {
    render(<Cell row={0} col={2} piece={null} />)
    expect(screen.getByRole('img', { name: 'Linha 1, coluna 3: vazia' })).toBeInTheDocument()
  })

  it('mostra a peça do personagem na cor dele', () => {
    const { container } = render(<Cell row={1} col={1} piece="ESTRELA" />)
    expect(screen.getByRole('img', { name: 'Linha 2, coluna 2: Estrela' })).toBeInTheDocument()
    expect(container.querySelector('[data-character="ESTRELA"]')).not.toBeNull()
    expect(container.firstElementChild).toHaveStyle({
      '--cell-color': CHARACTER_INFO.ESTRELA.color,
    })
  })

  it.each([
    ['ESCUDO', null, 'shield', 'bloqueada por Escudo por 2 turnos'],
    ['CONGELAR', 'X', 'frozen', 'congelada por 2 turnos'],
    ['REFORCO', 'O', 'reinforced', 'com Reforço por 2 turnos'],
  ] as const)('%s aparece com o contador de turnos', (kind, piece, layerName, text) => {
    const { container } = render(
      <Cell row={0} col={0} piece={piece} effects={[{ kind, turnsLeft: 2 }]} />,
    )
    expect(layer(container, layerName)).not.toBeNull()
    expect(layer(container, 'counters')).toHaveTextContent('2')
    expect(screen.getByRole('img')).toHaveAccessibleName(expect.stringContaining(text))
  })

  it('"1 turno" no singular', () => {
    render(<Cell row={0} col={0} piece="X" effects={[{ kind: 'CONGELAR', turnsLeft: 1 }]} />)
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Linha 1, coluna 1: X, congelada por 1 turno',
    )
  })

  it('peça congelada e com Reforço mostra os dois contadores', () => {
    const { container } = render(
      <Cell
        row={0}
        col={0}
        piece="QUADRADO"
        effects={[
          { kind: 'REFORCO', turnsLeft: 1 },
          { kind: 'CONGELAR', turnsLeft: 2 },
        ]}
      />,
    )
    expect(layer(container, 'counters')?.children).toHaveLength(2)
    expect(layer(container, 'frozen')).not.toBeNull()
    expect(layer(container, 'reinforced')).not.toBeNull()
  })

  it.each([
    ['target', 'alvo possível'],
    ['selected', 'alvo escolhido'],
  ] as const)('mira "%s" aparece e é anunciada', (aim, text) => {
    const { container } = render(<Cell row={0} col={0} piece="O" aim={aim} />)
    expect(layer(container, 'aim')).not.toBeNull()
    expect(screen.getByRole('img')).toHaveAccessibleName(expect.stringContaining(text))
  })

  it('linha vencedora aparece e é anunciada', () => {
    const { container } = render(<Cell row={3} col={0} piece="X" winning />)
    expect(layer(container, 'winning')).not.toBeNull()
    expect(screen.getByRole('img')).toHaveAccessibleName('Linha 4, coluna 1: X, linha vencedora')
  })

  it('efeito da habilidade resolvida: o ícone dela ou, anulada, o do Campo de Força', () => {
    const resolved = {
      by: 'P1' as const,
      ability: 'BOMBA' as const,
      targetCell: 0,
      destinationCell: null,
      absorbed: false,
      noEffect: false,
      serverTime: 1,
      receivedAt: 1,
    }
    const { container, rerender } = render(<Cell row={0} col={0} piece="O" />)
    expect(layer(container, 'ability-impact')).toBeNull()

    rerender(<Cell row={0} col={0} piece="O" impact={resolved} impactColor="#b07cff" />)
    expect(layer(container, 'ability-impact')?.querySelector('[data-ability]')).toHaveAttribute(
      'data-ability',
      'BOMBA',
    )

    rerender(<Cell row={0} col={0} piece="O" impact={{ ...resolved, absorbed: true }} />)
    expect(layer(container, 'ability-impact')?.querySelector('[data-ability]')).toHaveAttribute(
      'data-ability',
      'CAMPO_DE_FORCA',
    )
  })

  it('camadas dos estados são sobrepostas: não mudam o tamanho da casa', () => {
    const { container } = render(
      <Cell
        row={0}
        col={0}
        piece="X"
        aim="selected"
        winning
        effects={[
          { kind: 'CONGELAR', turnsLeft: 2 },
          { kind: 'REFORCO', turnsLeft: 2 },
        ]}
      />,
    )
    const layers = container.querySelectorAll('[data-layer]')
    expect(layers.length).toBeGreaterThanOrEqual(5)
    layers.forEach((el) => expect(el).toHaveClass('absolute'))
    expect(container.firstElementChild).toHaveClass('aspect-square')
  })

  it('com onSelect vira botão: clique e teclado chamam a ação', async () => {
    const onSelect = vi.fn<() => void>()
    render(<Cell row={0} col={0} piece={null} onSelect={onSelect} />)
    const button = screen.getByRole('button', { name: 'Linha 1, coluna 1: vazia' })

    await userEvent.click(button)
    button.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')

    expect(onSelect).toHaveBeenCalledTimes(3)
  })

  it('desabilitada ou sem onSelect não é clicável', () => {
    const onSelect = vi.fn<() => void>()
    const { rerender } = render(<Cell row={0} col={0} piece={null} onSelect={onSelect} disabled />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    rerender(<Cell row={0} col={0} piece={null} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
