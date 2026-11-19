import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('o nome é o título da tela e a cabeça do Vitão é decoração', () => {
    const { container } = render(<Logo />)
    expect(screen.getByRole('heading', { level: 1, name: 'Jogo do Velho' })).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('na vitrine, que já tem título, o nome vira texto', () => {
    render(<Logo as="p" size="lg" />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('Velho')).toBeInTheDocument()
  })
})
