import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ARENA_TEXTS } from '../../constants/texts'
import { useVoice } from '../../hooks/useLanguageFilter'
import { DEFAULT_SETTINGS, useSettingsStore } from '../../stores/settingsStore'
import { SettingsModal } from './SettingsModal'

vi.mock('../sound', () => ({ playSound: vi.fn<(key: string) => void>() }))

beforeEach(() => {
  useSettingsStore.setState(DEFAULT_SETTINGS)
})

const renderModal = () => render(<SettingsModal open onClose={() => {}} />)

describe('SettingsModal (FE-39)', () => {
  it('cada chave muda a preferência na hora', () => {
    renderModal()
    const filter = screen.getByRole('switch', { name: 'Filtro de palavrões' })
    expect(filter).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(filter)
    expect(filter).toHaveAttribute('aria-checked', 'true')
    expect(useSettingsStore.getState().languageFilter).toBe(true)

    fireEvent.click(screen.getByRole('switch', { name: 'Vibração' }))
    expect(useSettingsStore.getState().vibrationOn).toBe(false)
  })

  it('volume em porcentagem; desligado, o volume fica travado', () => {
    renderModal()
    const music = screen.getByRole('slider', { name: 'Volume da música' })
    expect(music).toHaveValue('30')

    fireEvent.change(music, { target: { value: '70' } })
    expect(useSettingsStore.getState().musicVolume).toBe(0.7)

    fireEvent.click(screen.getByRole('switch', { name: 'Música' }))
    expect(music).toBeDisabled()
  })

  it('Vitão desligado: a voz dele também fica travada', () => {
    renderModal()
    fireEvent.click(screen.getByRole('switch', { name: 'Vitão' }))
    expect(useSettingsStore.getState().vitaoOn).toBe(false)
    expect(screen.getByRole('slider', { name: 'Volume da voz do Vitão' })).toBeDisabled()
  })
})

describe('filtro de palavrões nos textos', () => {
  it('ligado nas Configurações, o narrador troca pela versão filtrada', () => {
    const line = ARENA_TEXTS.opponentDisconnected.line
    const { result, rerender } = renderHook(() => useVoice())
    expect(result.current(line)).toBe(line.unfiltered)

    useSettingsStore.setState({ languageFilter: true })
    rerender()
    expect(result.current(line)).toBe(line.filtered)
  })
})
