import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ABILITIES } from '../../constants/game'
import { INITIAL_MATCH_STATE, useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { VOICE_KEYS } from '../sound/soundMap'
import { buildVitaoLines, VITAO_LINES } from './vitaoLines'
import {
  ANNOUNCEMENT_VOICES,
  OPPONENT_LEFT_VOICE,
  pickVoice,
  playAnnouncementForServerEvent,
  RESULT_VOICES,
  voicesFor,
} from './vitaoVoices'

vi.mock('../sound/soundManager', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound/soundManager')>()),
  playVoice: vi.fn<(key: `vitao-${string}`) => void>(),
}))

import { playVoice } from '../sound/soundManager'

/** Toda fala gravada que o jogo pode tocar: balão do Vitão, anúncios e Resultado */
function referencedVoices() {
  const entries = [
    ...Object.values(VITAO_LINES),
    ...ABILITIES.map((abilityId) => buildVitaoLines({ abilityId }).ABILITY_OPPONENT),
    buildVitaoLines({ myTimeouts: 1 }).TIMEOUT_ME,
    buildVitaoLines({ myTimeouts: 2 }).TIMEOUT_ME,
  ]
  const fromLines = entries
    .flatMap((entry) => [...(entry?.normal ?? []), ...(entry?.devil ?? [])])
    .flatMap((line) => (line.audio ? [line.audio] : []))
  const pairs = [...Object.values(RESULT_VOICES), OPPONENT_LEFT_VOICE].flatMap((voice) => [
    voice.unfiltered,
    voice.filtered,
  ])
  return new Set([...fromLines, ...Object.values(ANNOUNCEMENT_VOICES).flat(), ...pairs])
}

beforeEach(() => {
  vi.clearAllMocks()
  useMatchStore.setState(INITIAL_MATCH_STATE, true)
  useRoomStore.setState({ phase: 'DRAFT', mySlot: 'P1' })
})

describe('falas gravadas do Rafik (FE-48)', () => {
  it('toda fala que o jogo toca tem o arquivo em src/assets/sounds/vitao/', () => {
    const missing = [...referencedVoices()].filter((key) => !VOICE_KEYS.includes(key))
    expect(missing).toEqual([])
  })

  it('e todo arquivo da pasta é usado em algum lugar', () => {
    const used = referencedVoices()
    expect(VOICE_KEYS.filter((key) => !used.has(key))).toEqual([])
  })

  it('com o filtro, a versão [C]; a fala de versão única toca nos dois modos', () => {
    expect(pickVoice(RESULT_VOICES.WIN!, false)).toBe('vitao-vitoria')
    expect(pickVoice(RESULT_VOICES.WIN!, true)).toBe('vitao-vitoria-filtrado')
    expect(pickVoice(RESULT_VOICES.WIN_FLAWLESS!, true)).toBe('vitao-vitoria-implacavel')
  })

  it('baixa antes da partida só as falas do modo do filtro', () => {
    const unfiltered = voicesFor(false)
    expect(unfiltered).toContain('vitao-match-point')
    expect(unfiltered).toContain('vitao-round-1')
    expect(unfiltered.some((key) => key.endsWith('-filtrado'))).toBe(false)

    const filtered = voicesFor(true)
    expect(filtered).toContain('vitao-match-point-filtrado')
    expect(filtered).toContain('vitao-round-1') // versão única
    expect(filtered).not.toContain('vitao-match-point')
  })

  it('anúncio de um evento ao vivo: o Confronto sorteia uma das duas gravações', () => {
    const versus = { type: 'PHASE_CHANGE', payload: { phase: 'VERSUS' } } as const
    playAnnouncementForServerEvent(versus, () => 0)
    expect(playVoice).toHaveBeenLastCalledWith('vitao-confronto')
    playAnnouncementForServerEvent(versus, () => 0.9)
    expect(playVoice).toHaveBeenLastCalledWith('vitao-confronto-2')
  })

  it('evento sem anúncio não toca nada', () => {
    playAnnouncementForServerEvent({ type: 'PHASE_CHANGE', payload: { phase: 'DRAFT' } })
    expect(playVoice).not.toHaveBeenCalled()
  })
})
