import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function cancel(dialog: HTMLElement) {
  fireEvent(dialog, createEvent('cancel', dialog, { cancelable: true }))
}

describe('Modal', () => {
  it('não renderiza nada fechado', () => {
    render(<Modal open={false} title="Como Jogar" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre como modal, com o título como nome acessível, conteúdo e ações', () => {
    render(
      <Modal open title="Como Jogar" actions={<button>Entendi</button>}>
        Alinhe 4 peças.
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Como Jogar' })
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveTextContent('Alinhe 4 peças.')
    expect(screen.getByRole('button', { name: 'Entendi' })).toBeInTheDocument()
  })

  it('fecha pelo botão, pelo Esc e pelo clique fora', async () => {
    const onClose = vi.fn<() => void>()
    render(<Modal open title="Configurações" onClose={onClose} />)
    const dialog = screen.getByRole('dialog')

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    cancel(dialog)
    fireEvent.click(dialog)

    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('ignora clique dentro do painel', () => {
    const onClose = vi.fn<() => void>()
    render(
      <Modal open title="Configurações" onClose={onClose}>
        <p>Som</p>
      </Modal>,
    )
    fireEvent.click(screen.getByText('Som'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('obrigatório: sem botão fechar e ignora Esc e clique fora', () => {
    const onClose = vi.fn<() => void>()
    render(<Modal open dismissible={false} title="Conexão perdida" onClose={onClose} />)
    const dialog = screen.getByRole('dialog')

    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()
    cancel(dialog)
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('obrigatório: reabre se o navegador forçar o fechamento', () => {
    render(<Modal open dismissible={false} title="Conexão perdida" />)
    const dialog = screen.getByRole('dialog') as HTMLDialogElement

    dialog.close()
    expect(dialog).toHaveAttribute('open')
  })

  it('dentro de data-modal-bounds ocupa só a moldura (e funciona sem ResizeObserver)', () => {
    expect(globalThis.ResizeObserver).toBeUndefined() // jsdom: é o caso que a proteção cobre
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top: 40, left: 20 } as DOMRect)
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(844)
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(390)

    render(
      <div data-modal-bounds>
        <Modal open title="Como Jogar" />
      </div>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.style.top).toBe('40px')
    expect(dialog.style.left).toBe('20px')
    expect(dialog.style.width).toBe('844px')
    expect(dialog.style.height).toBe('390px')

    rect.mockRestore()
    width.mockRestore()
    height.mockRestore()
  })

  it('fora de data-modal-bounds não mexe no posicionamento', () => {
    render(<Modal open title="Como Jogar" />)
    expect(screen.getByRole('dialog').style.top).toBe('')
  })

  it('sai do DOM quando `open` vira false', async () => {
    const { rerender } = render(<Modal open title="Como Jogar" />)
    rerender(<Modal open={false} title="Como Jogar" />)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
