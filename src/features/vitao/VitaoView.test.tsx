import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VitaoView } from './VitaoView'

const head = () => screen.getByAltText('Vitão').getAttribute('src')

describe('VitaoView', () => {
  it('mostra a cabeça da expressão recebida', () => {
    render(<VitaoView expression="SURPRESO" />)
    expect(head()).toContain('vitao-surpreso')
  })

  it('sem fala, não mostra o balão', () => {
    render(<VitaoView expression="NORMAL" />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('com fala, o balão é anunciado ao leitor de tela', () => {
    render(<VitaoView expression="RINDO" text="Round seu!" reactionId={1} />)
    expect(screen.getByRole('status')).toHaveTextContent('Round seu!')
  })

  it('na versão Diabo, o balão fica vermelho', () => {
    render(<VitaoView expression="DIABO" text="Bem-vindo ao inferno." devil reactionId={1} />)
    expect(screen.getByRole('status').className).toContain('text-danger')
  })
})
