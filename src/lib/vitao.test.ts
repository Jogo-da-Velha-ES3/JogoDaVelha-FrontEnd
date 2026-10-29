import { describe, expect, it } from 'vitest'
import {
  decideVitaoReaction,
  isBigMoment,
  VITAO_COOLDOWN_MS,
  type VitaoContext,
  type VitaoLines,
  type VitaoMoment,
} from './vitao'

const lines: VitaoLines = {
  MOVE_ME: {
    normal: [{ text: 'Jogada boa', expression: 'RINDO' }],
    devil: [{ text: 'Jogada sombria', expression: 'DIABO' }],
  },
  ROUND_WIN_ME: {
    normal: [{ text: 'Round seu', expression: 'SURPRESO' }],
    devil: [],
  },
  TIMEOUT_OPPONENT: {
    normal: [{ text: 'Dormiu, lixo', expression: 'DORMINDO', explicit: true }],
    devil: [],
  },
}

const ctx = (over: Partial<VitaoContext> = {}): VitaoContext => ({
  now: 100_000,
  lastSpeechAt: null,
  suddenDeath: false,
  filterOn: false,
  random: () => 0,
  ...over,
})

const move: VitaoMoment = { kind: 'MOVE', by: 'ME' }
const roundEnd: VitaoMoment = { kind: 'ROUND_END', winner: 'ME' }

describe('decideVitaoReaction', () => {
  it('sem momentos, fica quieto', () => {
    expect(decideVitaoReaction([], ctx(), lines)).toBeNull()
  })

  it('fala quando ainda não falou nenhuma vez', () => {
    const reaction = decideVitaoReaction([move], ctx(), lines)
    expect(reaction?.text).toBe('Jogada boa')
    expect(reaction?.expression).toBe('RINDO')
    expect(reaction?.devil).toBe(false)
  })

  it('no máximo 1 fala a cada 6s', () => {
    const now = 100_000
    const justBefore = ctx({ now, lastSpeechAt: now - VITAO_COOLDOWN_MS + 1 })
    expect(decideVitaoReaction([move], justBefore, lines)).toBeNull()

    const exactly = ctx({ now, lastSpeechAt: now - VITAO_COOLDOWN_MS })
    expect(decideVitaoReaction([move], exactly, lines)).not.toBeNull()
  })

  it('nem o momento grande fura o limite de 6s', () => {
    const recent = ctx({ lastSpeechAt: 100_000 - 1000 })
    expect(decideVitaoReaction([roundEnd], recent, lines)).toBeNull()
  })

  it('o momento grande passa na frente do pequeno, em qualquer ordem', () => {
    const a = decideVitaoReaction([move, roundEnd], ctx(), lines)
    const b = decideVitaoReaction([roundEnd, move], ctx(), lines)
    expect(a?.text).toBe('Round seu')
    expect(a?.big).toBe(true)
    expect(b?.text).toBe('Round seu')
  })

  it('classifica fim de round, Morte Súbita e W.O. como grandes', () => {
    expect(isBigMoment(roundEnd)).toBe(true)
    expect(isBigMoment({ kind: 'SUDDEN_DEATH_START' })).toBe(true)
    expect(isBigMoment({ kind: 'WO', winner: 'ME' })).toBe(true)
    expect(isBigMoment(move)).toBe(false)
    expect(isBigMoment({ kind: 'TIMEOUT', by: 'OPPONENT' })).toBe(false)
  })

  it('na Morte Súbita vira o Diabo: fala do Diabo e expressão Diabo', () => {
    const reaction = decideVitaoReaction([move], ctx({ suddenDeath: true }), lines)
    expect(reaction?.text).toBe('Jogada sombria')
    expect(reaction?.expression).toBe('DIABO')
    expect(reaction?.devil).toBe(true)
  })

  it('na Morte Súbita sem fala do Diabo, usa a normal mas com a expressão Diabo', () => {
    const reaction = decideVitaoReaction([roundEnd], ctx({ suddenDeath: true }), lines)
    expect(reaction?.text).toBe('Round seu')
    expect(reaction?.expression).toBe('DIABO')
  })

  it('com o filtro ligado, descarta as falas explícitas', () => {
    const moment: VitaoMoment = { kind: 'TIMEOUT', by: 'OPPONENT' }
    expect(decideVitaoReaction([moment], ctx({ filterOn: false }), lines)?.text).toBe(
      'Dormiu, lixo',
    )
    expect(decideVitaoReaction([moment], ctx({ filterOn: true }), lines)).toBeNull()
  })

  it('momento sem falas cadastradas: fica quieto, sem quebrar', () => {
    const moment: VitaoMoment = { kind: 'WO', winner: 'OPPONENT' }
    expect(decideVitaoReaction([moment], ctx(), lines)).toBeNull()
  })
})
