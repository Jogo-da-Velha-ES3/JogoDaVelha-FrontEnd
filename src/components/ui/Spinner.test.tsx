import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('anuncia o que está carregando e esconde o anel do leitor de tela', () => {
    render(<Spinner label="Carregando a Loja…" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Carregando a Loja…')
    expect(status.querySelector('[aria-hidden="true"]')).toHaveClass(
      'motion-safe:animate-spin',
      'motion-reduce:animate-glow-pulse',
    )
  })
})
