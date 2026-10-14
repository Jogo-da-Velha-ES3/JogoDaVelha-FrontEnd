import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useClockStore } from '../../stores/clockStore'
import { TimerBar } from './TimerBar'

const NOW = 1_700_000_000_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  useClockStore.getState().reset()
})

afterEach(() => {
  vi.useRealTimers()
})

const bar = () => screen.getByRole('progressbar')
const fill = () => bar().querySelector<HTMLElement>('[data-fill]')!

describe('TimerBar', () => {
  it('conta a partir do prazo do servidor', () => {
    render(<TimerBar deadline={{ startedAt: NOW - 2500, durationSeconds: 10 }} />)
    expect(bar()).toHaveAttribute('aria-valuenow', '8')
    expect(bar()).toHaveAttribute('aria-valuemax', '10')
    expect(bar()).toHaveAttribute('aria-valuetext', '8 segundos')
    expect(fill().style.transform).toBe('scaleX(0.75)')
  })

  it('anda com o tempo', () => {
    render(<TimerBar deadline={{ startedAt: NOW, durationSeconds: 8 }} />)
    expect(bar()).toHaveAttribute('aria-valuenow', '8')

    act(() => vi.advanceTimersByTime(3000))
    expect(bar()).toHaveAttribute('aria-valuenow', '5')

    act(() => vi.advanceTimersByTime(10_000))
    expect(bar()).toHaveAttribute('aria-valuenow', '0')
    expect(fill().style.transform).toBe('scaleX(0)')
  })

  it('corrige a diferença de relógio do aparelho', () => {
    // O servidor está 2s atrás do aparelho: o turno começou "agora" no relógio do servidor
    act(() => useClockStore.getState().syncWithServer(NOW - 2000, NOW))
    render(<TimerBar deadline={{ startedAt: NOW - 2000, durationSeconds: 10 }} />)
    expect(bar()).toHaveAttribute('aria-valuenow', '10')
  })

  it('fica vermelha só nos últimos segundos', () => {
    render(<TimerBar deadline={{ startedAt: NOW, durationSeconds: 5 }} warnAtSeconds={3} />)
    expect(bar()).not.toHaveAttribute('data-warning')

    act(() => vi.advanceTimersByTime(2100))
    expect(bar()).toHaveAttribute('data-warning')
    expect(fill().style.backgroundColor).toBe('var(--color-danger)')

    act(() => vi.advanceTimersByTime(5000))
    expect(bar()).not.toHaveAttribute('data-warning') // acabou: espera o servidor
  })

  it('sem prazo mostra a trilha vazia, do mesmo tamanho', () => {
    render(<TimerBar deadline={null} />)
    expect(bar()).toHaveAttribute('aria-valuenow', '0')
    expect(bar()).toHaveClass('h-2', 'flex-1')
    expect(fill().style.transform).toBe('scaleX(0)')
  })

  it('vertical esvazia de cima para baixo', () => {
    render(<TimerBar deadline={{ startedAt: NOW - 5000, durationSeconds: 10 }} vertical />)
    expect(bar()).toHaveClass('w-2')
    expect(fill()).toHaveClass('origin-bottom')
    expect(fill().style.transform).toBe('scaleY(0.5)')
  })

  it('não tem callback de "acabou o tempo": o timeout é do servidor', () => {
    // Se alguém criar um onExpire, o @ts-expect-error para de valer e o build quebra
    render(
      <TimerBar
        deadline={{ startedAt: NOW - 20_000, durationSeconds: 10 }}
        // @ts-expect-error TimerBar não decide timeout [RN-ARN-03]
        onExpire={() => {}}
      />,
    )
    expect(bar()).toHaveAttribute('aria-valuenow', '0')
  })
})
