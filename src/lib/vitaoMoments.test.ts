import { describe, expect, it } from 'vitest'
import type { Cell, PlayerSlot } from '../types/game'
import { momentsFromChange, type VitaoSnapshot } from './vitaoMoments'

const cells = (owners: Record<number, PlayerSlot> = {}): Cell[] =>
  Array.from({ length: 16 }, (_, index) => ({ index, owner: owners[index] ?? null, effects: [] }))

const snap = (over: Partial<VitaoSnapshot> = {}): VitaoSnapshot => ({
  cells: cells(),
  lastAbility: null,
  lastTimeout: null,
  opponentConnected: true,
  roundEnd: null,
  outcome: null,
  outcomeReceivedAt: null,
  introStartedAt: null,
  roundStartedAt: 1000,
  suddenDeath: false,
  score: { P1: 0, P2: 0 },
  ...over,
})

/** Retrato de antes (base) e de depois (base + mudanças), do ponto de vista do P1 */
const change = (over: Partial<VitaoSnapshot>, base: Partial<VitaoSnapshot> = {}) =>
  momentsFromChange(snap(base), snap({ ...base, ...over }), 'P1')

describe('momentsFromChange', () => {
  it('peça nova minha ou do oponente vira jogada', () => {
    expect(change({ cells: cells({ 5: 'P1' }) })).toEqual([{ kind: 'MOVE', by: 'ME' }])
    expect(change({ cells: cells({ 5: 'P2' }) })).toEqual([{ kind: 'MOVE', by: 'OPPONENT' }])
  })

  it('tabuleiro sem peça nova não é jogada (fim de turno, Tornado, Bomba, round novo)', () => {
    const base = { cells: cells({ 5: 'P2' }) }
    expect(change({}, base)).toEqual([]) // igual
    expect(change({ cells: cells({ 6: 'P2' }) }, base)).toEqual([]) // peça movida
    expect(change({ cells: cells() }, base)).toEqual([]) // peça removida
  })

  it('reconexão não vira jogada: tabuleiro vazio recarregado sem ROUND_START', () => {
    expect(change({ cells: cells({ 5: 'P2' }) }, { roundStartedAt: null })).toEqual([])
    expect(change({ cells: cells({ 1: 'P1', 2: 'P2', 3: 'P1' }) })).toEqual([]) // várias de uma vez
  })

  it('habilidade nova carrega quem usou, qual foi e se foi anulada ou sem efeito', () => {
    const lastAbility = {
      by: 'P2' as const,
      absorbed: true,
      noEffect: false,
      ability: 'BOMBA' as const,
    }
    expect(change({ lastAbility })).toEqual([
      { kind: 'ABILITY', by: 'OPPONENT', absorbed: true, noEffect: false, abilityId: 'BOMBA' },
    ])
    // A mesma habilidade, sem objeto novo, não reage de novo
    expect(momentsFromChange(snap({ lastAbility }), snap({ lastAbility }), 'P1')).toEqual([])
  })

  it('estouro de tempo carrega quantos estouros seguidos (a fala do Rafik muda no 2º)', () => {
    expect(change({ lastTimeout: { player: 'P1', consecutiveTimeouts: 2 } })).toEqual([
      { kind: 'TIMEOUT', by: 'ME', count: 2 },
    ])
  })

  it('oponente caiu: reage na queda, não enquanto continua fora nem quando volta', () => {
    expect(change({ opponentConnected: false })).toEqual([{ kind: 'OPPONENT_DISCONNECTED' }])
    expect(change({}, { opponentConnected: false })).toEqual([])
    expect(change({ opponentConnected: true }, { opponentConnected: false })).toEqual([])
  })

  it('fim de round: vitória minha, do oponente e empate', () => {
    expect(change({ roundEnd: { winner: 'P1' } })).toEqual([{ kind: 'ROUND_END', winner: 'ME' }])
    expect(change({ roundEnd: { winner: 'P2' } })).toEqual([
      { kind: 'ROUND_END', winner: 'OPPONENT' },
    ])
    expect(change({ roundEnd: { winner: null } })).toEqual([{ kind: 'ROUND_END', winner: 'DRAW' }])
  })

  it('Morte Súbita: só quando o round 3 entra em jogo', () => {
    expect(change({ suddenDeath: true, introStartedAt: 5000 })).toEqual([
      { kind: 'SUDDEN_DEATH_START' },
    ])
    // Mesmo com o horário do round anterior guardado, o valor novo conta
    expect(change({ suddenDeath: true, introStartedAt: 5000 }, { introStartedAt: 4000 })).toEqual([
      { kind: 'SUDDEN_DEATH_START' },
    ])
    expect(change({ introStartedAt: 5000 })).toEqual([]) // não é Morte Súbita
    expect(change({ suddenDeath: true }, { suddenDeath: true, introStartedAt: 4000 })).toEqual([])
  })

  it('match point: o round entra em jogo com alguém em 1 vitória', () => {
    expect(change({ introStartedAt: 5000, score: { P1: 1, P2: 0 } })).toEqual([
      { kind: 'MATCH_POINT', leader: 'ME' },
    ])
    expect(change({ introStartedAt: 5000, score: { P1: 0, P2: 1 } })).toEqual([
      { kind: 'MATCH_POINT', leader: 'OPPONENT' },
    ])
  })

  it('match point: não no 0×0, nem na Morte Súbita, nem fora da entrada do round', () => {
    expect(change({ introStartedAt: 5000 })).toEqual([]) // round 1 empatou: 0×0
    expect(change({ introStartedAt: 5000, suddenDeath: true, score: { P1: 1, P2: 1 } })).toEqual([
      { kind: 'SUDDEN_DEATH_START' },
    ])
    // Já em jogo (mesma hora de entrada) ou snapshot de reconexão (sem hora)
    const base = { introStartedAt: 5000, score: { P1: 1, P2: 0 } }
    expect(change({}, base)).toEqual([])
    expect(change({ score: { P1: 1, P2: 0 } })).toEqual([])
  })

  it('W.O.: reage uma vez, quando o MATCH_END acaba de chegar', () => {
    const outcome = { kind: 'WO' as const, winner: 'P2' as const }
    expect(change({ outcome, outcomeReceivedAt: 2000 })).toEqual([
      { kind: 'WO', winner: 'OPPONENT' },
    ])
    // Repetido (mesma hora do primeiro) ou vindo de snapshot (sem hora): não reage
    expect(change({ outcome }, { outcome, outcomeReceivedAt: 2000 })).toEqual([])
    expect(change({ outcome })).toEqual([])
  })

  it('outros desfechos não geram reação', () => {
    expect(change({ outcome: { kind: 'ABSOLUTE_DRAW' }, outcomeReceivedAt: 2000 })).toEqual([])
  })
})
