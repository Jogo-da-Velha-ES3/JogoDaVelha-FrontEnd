import { describe, expect, it } from 'vitest'
import { ABILITIES } from './game'
import {
  ABILITY_TEXTS,
  ACCESS_TEXTS,
  APP_TEXTS,
  ARENA_TEXTS,
  DRAFT_TEXTS,
  HUB_TEXTS,
  joinParts,
  RESULT_TEXTS,
  ROOM_TEXTS,
  voiceText,
  type VoiceLine,
} from './texts'

const ALL_TEXTS = {
  APP_TEXTS,
  ACCESS_TEXTS,
  HUB_TEXTS,
  ROOM_TEXTS,
  DRAFT_TEXTS,
  ARENA_TEXTS,
  ABILITY_TEXTS,
  RESULT_TEXTS,
}

const isVoiceLine = (value: unknown): value is VoiceLine<string | null> =>
  typeof value === 'object' && value !== null && 'unfiltered' in value && 'filtered' in value

/** Todas as falas do narrador: as fixas (achadas no arquivo) e as que dependem do momento */
function voiceLines(): { path: string; line: VoiceLine<string | null> }[] {
  const found: { path: string; line: VoiceLine<string | null> }[] = []
  const walk = (value: unknown, path: string) => {
    if (isVoiceLine(value)) found.push({ path, line: value })
    else if (typeof value === 'object' && value !== null) {
      for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`)
    }
  }
  walk(ALL_TEXTS, 'texts')
  const { roundIntro, timeout } = ARENA_TEXTS
  found.push(
    { path: 'matchPointLine(eu na frente)', line: roundIntro.matchPointLine(true) },
    { path: 'matchPointLine(oponente na frente)', line: roundIntro.matchPointLine(false) },
    { path: 'timeout.mine(1)', line: timeout.mine(1) },
    { path: 'timeout.mine(2)', line: timeout.mine(2) },
  )
  return found
}

// O que só pode aparecer sem filtro: xingamento e duplo sentido (docs/VOICE_GUIDE.md)
const UNFILTERED_ONLY = [
  'mané',
  'babaca',
  'cala a boca',
  'arregou',
  'vergonha',
  'cego',
  'mandou medir',
  'velhinha',
]

describe('voz do jogo (FE-40)', () => {
  it('acha as falas do narrador espalhadas pelas telas', () => {
    expect(voiceLines().length).toBeGreaterThan(20)
  })

  it.each(voiceLines())('$path: a versão filtrada não tem xingamento', ({ line }) => {
    expect(line.unfiltered.trim()).not.toBe('')
    if (line.filtered === null) return
    expect(line.filtered.trim()).not.toBe('')
    for (const word of UNFILTERED_ONLY) expect(line.filtered.toLowerCase()).not.toContain(word)
  })

  it('toda habilidade tem fala no aviso do oponente', () => {
    expect(Object.keys(ABILITY_TEXTS.lines).sort()).toEqual([...ABILITIES].sort())
  })

  it('o filtro escolhe a versão, e a fala sem versão limpa some', () => {
    const line = ABILITY_TEXTS.noEffectLine
    expect(voiceText(line, false)).toBe(line.unfiltered)
    expect(voiceText(line, true)).toBe(line.filtered)
    expect(voiceText(ABILITY_TEXTS.absorbedLine, true)).toBeNull()
  })

  it('joinParts junta com " · " e pula o que sumiu', () => {
    expect(joinParts('Tá dormindo na rede?!', '1/3')).toBe('Tá dormindo na rede?! · 1/3')
    expect(joinParts(null, 'Placar 1 × 0')).toBe('Placar 1 × 0')
  })

  it('a contagem de estouros e o tempo da Morte Súbita vêm das regras', () => {
    expect(ARENA_TEXTS.timeout.count(2)).toBe('2/3')
    expect(ARENA_TEXTS.suddenDeath.perMove).toBe('5 segundos por jogada')
  })
})
