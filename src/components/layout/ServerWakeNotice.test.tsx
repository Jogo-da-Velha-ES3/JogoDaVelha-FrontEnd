import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useServerWakeStore } from '../../stores/serverWakeStore'
import { ServerWakeNotice } from './ServerWakeNotice'

const notice = () => screen.queryByRole('status')

beforeEach(() => {
  useServerWakeStore.setState({ slowCalls: 0 })
})

describe('aviso "Acordando o servidor…" (FE-51)', () => {
  it('aparece só enquanto há chamada lenta, com a piada e o tempo', () => {
    render(<ServerWakeNotice />)
    expect(notice()).not.toBeInTheDocument()

    act(() => useServerWakeStore.setState({ slowCalls: 1 }))
    expect(notice()).toHaveTextContent('Acordando o servidor…')
    expect(notice()).toHaveTextContent(
      'O velhinho tá levantando da cadeira · pode levar uns minutinhos',
    )

    act(() => useServerWakeStore.setState({ slowCalls: 0 }))
    expect(notice()).not.toBeInTheDocument()
  })

  it('não recebe toque: nunca atrapalha a tela de baixo', () => {
    useServerWakeStore.setState({ slowCalls: 1 })
    render(<ServerWakeNotice />)
    expect(notice()?.parentElement).toHaveClass('pointer-events-none')
  })
})
