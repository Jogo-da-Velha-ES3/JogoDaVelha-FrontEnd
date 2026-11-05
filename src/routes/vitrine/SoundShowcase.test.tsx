import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ABILITIES } from '../../constants/game'
import { DEFAULT_SETTINGS, useSettingsStore } from '../../stores/settingsStore'
import { SoundShowcase } from './SoundShowcase'

// O motor de som imitado: cada chamada vai para um registro, na ordem em que acontece
const { log } = vi.hoisted(() => ({ log: [] as string[] }))

vi.mock('../../features/sound/soundManager', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../features/sound/soundManager')>()),
  playMusic: (key: string) => log.push(`trilha:${key}`),
  stopAllMusic: () => log.push('para-trilha'),
  playSound: (key: string) => log.push(`som:${key}`),
  stopSound: (key: string) => log.push(`para-som:${key}`),
  playLoopSound: (key: string) => log.push(`loop:${key}`),
  stopLoopSound: (key: string) => log.push(`para-loop:${key}`),
  soundDuration: () => 1,
}))

const button = (name: string) => screen.getByRole('button', { name })
/** Deixa a partida encurtada andar até o fim (cada passo espera no máximo 5s) */
function playToTheEnd() {
  for (let i = 0; i < 40; i++) {
    act(() => {
      vi.advanceTimersByTime(5000)
    })
  }
}

beforeEach(() => {
  log.length = 0
  useSettingsStore.setState(DEFAULT_SETTINGS)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('aba Sons da vitrine (FE-38)', () => {
  it('cada som toca sozinho; trilhas e loops ligam e desligam', () => {
    render(<SoundShowcase />)

    fireEvent.click(button('Bomba'))
    fireEvent.click(button('Trilha da Arena'))
    fireEvent.click(button('Trilha da Arena'))
    fireEvent.click(button('Coração (loop)'))
    fireEvent.click(button('Coração (loop)'))

    expect(log).toEqual([
      'som:habilidade-BOMBA',
      'trilha:trilha-arena',
      'para-trilha',
      'loop:coracao',
      'para-loop:coracao',
    ])
  })

  it('a partida encurtada toca tudo na ordem do jogo e termina sozinha', () => {
    vi.useFakeTimers()
    render(<SoundShowcase />)

    fireEvent.click(button('Tocar a partida encurtada')) // o primeiro passo já toca no clique
    playToTheEnd()

    const played = log.filter((entry) => /^(trilha|som|loop):/.test(entry))
    expect(played).toEqual([
      'trilha:trilha-hub',
      'som:botao',
      'trilha:trilha-sala',
      'trilha:trilha-arena',
      'som:jogada',
      ...ABILITIES.map((ability) => `som:habilidade-${ability}`),
      'som:estouro-tempo',
      'som:fim-round',
      'som:morte-subita',
      'trilha:trilha-morte-subita',
      'loop:coracao',
      'loop:tique-taque',
      'som:vitoria',
      'som:coins',
      'som:derrota',
      'som:empate',
    ])
    // No Resultado a trilha e os loops param antes da vinheta
    expect(log.indexOf('para-trilha')).toBeLessThan(log.indexOf('som:vitoria'))
    expect(log).toContain('para-loop:coracao')
    expect(button('Tocar a partida encurtada')).toBeEnabled()
  })

  it('avisa quando a música está desligada nas Configurações (as trilhas tocariam mudas)', () => {
    const { rerender } = render(<SoundShowcase />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => useSettingsStore.setState({ musicOn: false }))
    rerender(<SoundShowcase />)

    expect(screen.getByRole('status')).toHaveTextContent('a música (as 4 trilhas) está sem som')
  })

  it('Parar silencia tudo e nada mais toca', () => {
    vi.useFakeTimers()
    render(<SoundShowcase />)
    fireEvent.click(button('Tocar a partida encurtada'))
    act(() => {
      vi.advanceTimersByTime(5000) // já no botão
    })

    fireEvent.click(button('Parar'))
    const afterStop = log.length
    playToTheEnd()

    expect(log.slice(afterStop - 4, afterStop)).toEqual(
      expect.arrayContaining(['para-loop:coracao', 'para-loop:tique-taque', 'para-trilha']),
    )
    expect(log.slice(afterStop)).toEqual([])
    expect(screen.getByRole('button', { name: 'Trilha do Hub' })).toBeEnabled()
  })
})
