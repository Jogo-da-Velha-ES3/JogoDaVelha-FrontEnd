import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  VITAO_COLOR,
  VITAO_DEVIL_COLOR,
  VITAO_DEVIL_PALETTE,
  VITAO_EXPRESSIONS,
  VITAO_PALETTE,
  VITAO_PART_ORDER,
  type VitaoExpression,
} from './figure'
import { VitaoFigure } from './VitaoFigure'

const EXPRESSIONS = Object.keys(VITAO_EXPRESSIONS) as VitaoExpression[]

/** Cores de preenchimento dos traços do corpo */
function fills(container: HTMLElement) {
  return new Set(
    [...container.querySelectorAll('[data-part] path[fill]')].map((p) => p.getAttribute('fill')),
  )
}

/** Cor do contorno neon em volta da silhueta */
const neonColor = (container: HTMLElement) =>
  container.querySelector('feFlood')?.getAttribute('flood-color')

describe('VitaoFigure', () => {
  it.each(EXPRESSIONS)('%s: mostra a cabeça certa, com o nome da expressão', (expression) => {
    const { container } = render(<VitaoFigure expression={expression} />)
    const { image, label } = VITAO_EXPRESSIONS[expression]

    expect(screen.getByRole('img', { name: `Vitão ${label}` })).toBeInTheDocument()
    expect(container.querySelector('[data-part="cabeca"]')).toHaveAttribute('href', image)
  })

  it('tem as partes separadas para a FE-42 animar, cada uma com o ponto de giro', () => {
    const { container } = render(<VitaoFigure />)

    for (const part of VITAO_PART_ORDER) {
      const group = container.querySelector<SVGGElement>(`g[data-part="${part}"]`)
      expect(group).not.toBeNull()
      expect(group?.style.transformOrigin).toMatch(/px .*px/)
    }
  })

  it('pele no tom da cabeça e contorno neon branco', () => {
    const { container } = render(<VitaoFigure />)
    expect(fills(container)).toContain(VITAO_PALETTE.skin)
    expect(neonColor(container)).toBe(VITAO_COLOR)
  })

  it('na versão Diabo a pele e o neon ficam vermelhos e aparece o rabo', () => {
    const normal = render(<VitaoFigure />)
    const normalPaths = normal.container.querySelectorAll('[data-part="tronco"] path').length
    normal.unmount()

    const { container } = render(<VitaoFigure expression="diabo" />)
    expect(fills(container)).toContain(VITAO_DEVIL_PALETTE.skin)
    expect(fills(container)).not.toContain(VITAO_PALETTE.skin)
    expect(neonColor(container)).toBe(VITAO_DEVIL_COLOR)
    expect(container.querySelectorAll('[data-part="tronco"] path').length).toBeGreaterThan(
      normalPaths,
    )
  })

  it('decorativo some para os leitores de tela', () => {
    render(<VitaoFigure decorative />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('cada instância tem o próprio filtro de contorno', () => {
    const { container } = render(
      <>
        <VitaoFigure />
        <VitaoFigure expression="rindo" />
      </>,
    )
    const ids = [...container.querySelectorAll('filter')].map((f) => f.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })
})
