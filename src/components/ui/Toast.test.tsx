import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TOAST_DEFAULT_DURATION,
  TOAST_MAX_VISIBLE,
  showToast,
  useToastStore,
} from '../../stores/toastStore'
import { Toaster } from './Toast'

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toastStore', () => {
  it('cria toast com tom e duração padrão', () => {
    showToast({ message: 'Código copiado!' })
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({
        message: 'Código copiado!',
        tone: 'info',
        duration: TOAST_DEFAULT_DURATION,
      }),
    ])
  })

  it(`mantém no máximo ${TOAST_MAX_VISIBLE} e descarta o mais antigo`, () => {
    for (let i = 1; i <= TOAST_MAX_VISIBLE + 1; i++) showToast({ message: `t${i}` })
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['t2', 't3', 't4'])
  })

  it('remove pelo id', () => {
    const id = showToast({ message: 'a' })
    showToast({ message: 'b' })
    useToastStore.getState().dismissToast(id)
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['b'])
  })
})

describe('Toaster', () => {
  it('mostra o toast numa região anunciada e remove depois da duração', () => {
    vi.useFakeTimers()
    render(<Toaster />)

    act(() => {
      showToast({ message: 'Sala 4821 não encontrada', tone: 'danger', duration: 1000 })
    })
    expect(screen.getByRole('status')).toHaveTextContent('Sala 4821 não encontrada')

    act(() => vi.advanceTimersByTime(999))
    expect(useToastStore.getState().toasts).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1))
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
