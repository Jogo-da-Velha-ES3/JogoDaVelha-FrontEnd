import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VITAO_DECISION_WINDOW_MS } from '../../constants/game'
import { initialBoardState, useBoardStore } from '../../stores/boardStore'
import { INITIAL_MATCH_STATE, useMatchStore } from '../../stores/matchStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../../stores/settingsStore'
import { playVoice, preloadVoices } from '../sound/soundManager'
import { VitaoSlot } from './VitaoSlot'

vi.mock('../sound/soundManager', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound/soundManager')>()),
  playVoice: vi.fn<(key: `vitao-${string}`) => void>(),
  preloadVoices: vi.fn<(keys: readonly `vitao-${string}`[]) => void>(),
}))

const head = () => screen.getByAltText('Vitão').getAttribute('src')

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

beforeEach(() => {
  useBoardStore.setState(initialBoardState(), true)
  useMatchStore.setState(INITIAL_MATCH_STATE, true)
  useSettingsStore.setState(DEFAULT_SETTINGS)
})

describe('VitaoSlot', () => {
  it('calado, fica com a cara normal', () => {
    render(<VitaoSlot />)
    expect(head()).toContain('vitao-normal')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('na Morte Súbita é o Diabo o tempo todo, mesmo calado', () => {
    useMatchStore.setState({ suddenDeath: true })
    render(<VitaoSlot />)
    expect(head()).toContain('vitao-diabo')
  })

  it('desligado nas Configurações (FE-39), o espaço fica vazio', () => {
    useSettingsStore.setState({ vitaoOn: false })
    const { container } = render(<VitaoSlot />)
    expect(screen.queryByAltText('Vitão')).toBeNull()
    expect(container.querySelector('[data-region="vitao"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('voz do Rafik (FE-48): baixa as falas ao entrar e fala junto com o balão', () => {
    vi.useFakeTimers()
    useMatchStore.setState({ roundStartedAt: 1000 })
    render(<VitaoSlot />)
    expect(preloadVoices).toHaveBeenCalledWith(expect.arrayContaining(['vitao-tempo-esgotado-1']))

    act(() =>
      useMatchStore.setState({
        lastTimeout: { player: 'P1', consecutiveTimeouts: 1, serverTime: 0, receivedAt: 0 },
      }),
    )
    act(() => void vi.advanceTimersByTime(VITAO_DECISION_WINDOW_MS))
    expect(screen.getByRole('status')).toBeInTheDocument() // o balão
    expect(playVoice).toHaveBeenCalledWith('vitao-tempo-esgotado-1')
  })

  it('Vitão desligado: nada é baixado e nenhuma voz toca', () => {
    useSettingsStore.setState({ vitaoOn: false })
    render(<VitaoSlot />)
    expect(preloadVoices).not.toHaveBeenCalled()
  })
})
