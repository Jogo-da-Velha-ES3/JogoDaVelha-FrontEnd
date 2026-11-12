import { describe, expect, it } from 'vitest'
import { ABILITY_TEXTS } from '../../constants/texts'
import { decideVitaoReaction, type VitaoContext } from '../../lib/vitao'
import { buildVitaoLines, VITAO_LINES } from './vitaoLines'

const suddenDeath: VitaoContext = {
  now: 10_000,
  lastSpeechAt: null,
  suddenDeath: true,
  filterOn: false,
  random: () => 0,
}

describe('falas do Vitão na Morte Súbita (decidido em 11/11)', () => {
  it('momento com gravação do Rafik não tem fala do Diabo: vale a gravação', () => {
    const recordedWithDevil = Object.entries(VITAO_LINES)
      .filter(([, entry]) => entry?.normal.some((line) => line.audio) && entry.devil.length > 0)
      .map(([key]) => key)
    expect(recordedWithDevil).toEqual([])
  })

  it('habilidade do oponente: a frase gravada daquela habilidade, com a cara de Diabo', () => {
    const lines = buildVitaoLines({ abilityId: 'BOMBA' })
    const moment = { kind: 'ABILITY', by: 'OPPONENT', absorbed: false, noEffect: false } as const
    expect(decideVitaoReaction([moment], suddenDeath, lines)).toMatchObject({
      text: ABILITY_TEXTS.lines.BOMBA.unfiltered,
      expression: 'DIABO',
      devil: true,
      audio: 'vitao-habilidade-bomba',
    })
  })

  it('jogada de peça (sem gravação) continua com a fala do Diabo', () => {
    const reaction = decideVitaoReaction([{ kind: 'MOVE', by: 'ME' }], suddenDeath, VITAO_LINES)
    expect(VITAO_LINES.MOVE_ME?.devil.map((line) => line.text)).toContain(reaction?.text)
    expect(reaction?.audio).toBeUndefined()
  })
})
