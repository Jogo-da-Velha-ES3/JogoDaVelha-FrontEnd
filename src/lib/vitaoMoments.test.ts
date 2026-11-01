import { describe, expect, it } from 'vitest'
import type { Cell, PlayerSlot } from '../types/game'
import { momentsFromChange, type VitaoSnapshot } from './vitaoMoments'

const cells = (owners: Record<number, PlayerSlot> = {}): Cell[] =>
  Array.from({ length: 16 }, (_, index) => ({ index, owner: owners[index] ?? null, effects: [] }))

const snap = (over: Partial<VitaoSnapshot> = {}): VitaoSnapshot => ({
  cells: cells(),
  lastAbility: null,
  lastTimeout: null,
  roundEnd: null,
  outcome: null,
  outcomeReceivedAt: null,
  introStartedAt: null,
  roundStartedAt: 1000,
  suddenDeath: false,
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

  it('habilidade nova carrega quem usou e se foi anulada ou sem efeito', () => {
    const lastAbility = { by: 'P2' as const, absorbed: true, noEffect: false }
    expect(change({ lastAbility })).toEqual([
      { kind: 'ABILITY', by: 'OPPONENT', absorbed: true, noEffect: false },
    ])
    // A mesma habilidade, sem objeto novo, não reage de novo
    expect(momentsFromChange(snap({ lastAbility }), snap({ lastAbility }), 'P1')).toEqual([])
  })

  it('estouro de tempo', () => {
    expect(change({ lastTimeout: { player: 'P1' } })).toEqual([{ kind: 'TIMEOUT', by: 'ME' }])
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
