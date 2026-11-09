import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Banner } from './Banner'

describe('Banner', () => {
  it('não renderiza nada escondido', () => {
    render(<Banner show={false} title="Sua vez" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('anuncia título e subtítulo', () => {
    render(<Banner show title="Match Point" subtitle="Round 2" />)
    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent('Match Point')
    expect(banner).toHaveTextContent('Round 2')
  })

  it('usa a cor do tom e deixa a cor do personagem ter prioridade', () => {
    const { rerender } = render(<Banner show title="Morte Súbita" tone="danger" />)
    expect(screen.getByRole('status').style.getPropertyValue('--banner-color')).toBe(
      'var(--color-danger)',
    )

    rerender(<Banner show title="Sua vez" tone="danger" color="#b07cff" />)
    expect(screen.getByRole('status').style.getPropertyValue('--banner-color')).toBe('#b07cff')
  })
})
