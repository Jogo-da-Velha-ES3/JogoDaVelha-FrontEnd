import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('é type="button" por padrão, para não enviar formulários sem querer', () => {
    render(<Button>Criar Sala</Button>)
    expect(screen.getByRole('button', { name: 'Criar Sala' })).toHaveAttribute('type', 'button')
  })

  it('aplica variante, tamanho e classes extras', () => {
    render(
      <Button variant="danger" size="lg" block className="mt-2">
        Sair
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-danger', 'min-h-13', 'w-full', 'mt-2')
  })

  it('não dispara clique quando desabilitado', async () => {
    const onClick = vi.fn<() => void>()
    render(
      <Button disabled onClick={onClick}>
        Entrar
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
