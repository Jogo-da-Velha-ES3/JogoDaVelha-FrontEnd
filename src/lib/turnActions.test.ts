import { describe, expect, it } from 'vitest'
import { canEndTurn, turnStep } from './turnActions'

const actions = (moveUsed: boolean, abilityUsed: boolean) => ({ moveUsed, abilityUsed })

describe('turnStep (BE-046)', () => {
  it('no começo do turno, jogada e habilidade', () => {
    expect(turnStep({ actions: actions(false, false), silenced: false, abilityLeft: true })).toBe(
      'BOTH',
    )
  })

  it('falta só uma: a outra já foi feita ou não dá', () => {
    expect(turnStep({ actions: actions(true, false), silenced: false, abilityLeft: true })).toBe(
      'ABILITY_LEFT',
    )
    expect(turnStep({ actions: actions(false, true), silenced: false, abilityLeft: true })).toBe(
      'MOVE_LEFT',
    )
    // Silenciado ou com o deck gasto, só a jogada
    expect(turnStep({ actions: actions(false, false), silenced: true, abilityLeft: true })).toBe(
      'MOVE_LEFT',
    )
    expect(turnStep({ actions: actions(false, false), silenced: false, abilityLeft: false })).toBe(
      'MOVE_LEFT',
    )
  })

  it('jogou e não tem habilidade para usar: só passar a vez', () => {
    expect(turnStep({ actions: actions(true, false), silenced: true, abilityLeft: true })).toBe(
      'NOTHING_LEFT',
    )
    expect(turnStep({ actions: actions(true, false), silenced: false, abilityLeft: false })).toBe(
      'NOTHING_LEFT',
    )
  })

  it('as duas feitas: o servidor fecha o turno', () => {
    expect(turnStep({ actions: actions(true, true), silenced: false, abilityLeft: true })).toBe(
      'CLOSED',
    )
  })
})

describe('canEndTurn', () => {
  it('só depois de agir, e antes de o turno fechar', () => {
    expect(canEndTurn(actions(false, false))).toBe(false)
    expect(canEndTurn(actions(true, false))).toBe(true)
    expect(canEndTurn(actions(false, true))).toBe(true)
    expect(canEndTurn(actions(true, true))).toBe(false)
  })
})
