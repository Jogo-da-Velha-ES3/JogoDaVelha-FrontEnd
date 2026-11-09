import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ABILITIES } from '../../constants/game'
import { AbilityIcon } from './AbilityIcon'

// Emojis e símbolos pictográficos (FE-46: a interface não usa emoji)
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{23E9}-\u{23FA}]/u

describe('AbilityIcon (FE-46)', () => {
  it.each(ABILITIES)('%s: SVG decorativo na cor do texto, sem emoji', (ability) => {
    const { container } = render(<AbilityIcon ability={ability} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('data-ability', ability)
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg.querySelector('path[stroke="currentColor"]')).not.toBeNull()
    expect(container.textContent).not.toMatch(EMOJI)
  })

  it('os 10 desenhos são diferentes entre si', () => {
    const drawings = ABILITIES.map((ability) => {
      const { container } = render(<AbilityIcon ability={ability} />)
      return [...container.querySelectorAll('path, circle')]
        .map((el) => el.getAttribute('d') ?? el.getAttribute('cx'))
        .join('|')
    })
    expect(new Set(drawings).size).toBe(ABILITIES.length)
  })

  it('dois ícones na mesma tela usam filtros de brilho diferentes', () => {
    const { container } = render(
      <>
        <AbilityIcon ability="BOMBA" />
        <AbilityIcon ability="BOMBA" />
      </>,
    )
    const ids = [...container.querySelectorAll('filter')].map((f) => f.id)
    expect(new Set(ids).size).toBe(2)
  })
})
