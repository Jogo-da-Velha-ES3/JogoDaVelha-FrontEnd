import { describe, expect, it } from 'vitest'
import type { ServerEvent } from '../types/events'
import { announcementFor, type AnnouncementState } from './vitaoAnnouncements'

const state = (over: Partial<AnnouncementState> = {}): AnnouncementState => ({
  phase: 'ROUND_DRAW',
  round: 1,
  score: { P1: 0, P2: 0 },
  suddenDeath: false,
  mySlot: 'P1',
  ...over,
})

const phase = (to: 'VERSUS' | 'PLAYING' | 'ROUND_END'): ServerEvent => ({
  type: 'PHASE_CHANGE',
  payload: { phase: to },
})
const roundEnd = (winner: 'P1' | 'P2' | null): ServerEvent => ({
  type: 'ROUND_END',
  payload: { round: 1, winner, winningLine: null, score: { P1: 0, P2: 0 } },
})
const timeout = (player: 'P1' | 'P2', consecutiveTimeouts: number): ServerEvent => ({
  type: 'TURN_TIMEOUT',
  payload: { player, consecutiveTimeouts },
})

describe('anúncios gravados do Rafik (FE-48)', () => {
  it('Confronto na entrada do VS', () => {
    expect(announcementFor(phase('VERSUS'), state({ phase: 'DRAFT' }))).toBe('VERSUS')
  })

  it('Round 1 e Round 2 quando o round entra em jogo, depois do sorteio', () => {
    expect(announcementFor(phase('PLAYING'), state())).toBe('ROUND_1')
    // Round 1 empatou: 0×0 no round 2, sem match point
    expect(announcementFor(phase('PLAYING'), state({ round: 2 }))).toBe('ROUND_2')
  })

  it('com match point ou na Morte Súbita, quem anuncia o round é a fala do Vitão', () => {
    const matchPoint = state({ round: 2, score: { P1: 1, P2: 0 } })
    expect(announcementFor(phase('PLAYING'), matchPoint)).toBeNull()
    const suddenDeath = state({ round: 3, score: { P1: 1, P2: 1 }, suddenDeath: true })
    expect(announcementFor(phase('PLAYING'), suddenDeath)).toBeNull()
  })

  it('fase repetida não anuncia de novo', () => {
    expect(announcementFor(phase('PLAYING'), state({ phase: 'PLAYING' }))).toBeNull()
  })

  it('round empatado; no round 3 (Morte Súbita), empate absoluto', () => {
    expect(announcementFor(roundEnd(null), state())).toBe('ROUND_DRAW')
    expect(announcementFor(roundEnd(null), state({ suddenDeath: true }))).toBe('ABSOLUTE_DRAW')
    expect(announcementFor(roundEnd('P1'), state())).toBeNull() // vitória: fala do Vitão
  })

  it('"O oponente perdeu a vez" no 1º e no 2º estouro dele, nunca no meu nem no W.O.', () => {
    expect(announcementFor(timeout('P2', 1), state())).toBe('OPPONENT_TIMEOUT')
    expect(announcementFor(timeout('P2', 2), state())).toBe('OPPONENT_TIMEOUT')
    expect(announcementFor(timeout('P2', 3), state())).toBeNull()
    expect(announcementFor(timeout('P1', 1), state())).toBeNull()
  })
})
