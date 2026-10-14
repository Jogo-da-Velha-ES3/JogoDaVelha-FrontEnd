import { describe, expect, it } from 'vitest'
import type { Cell, DeckSlot, PlayerSlot } from '../../types/game'
import { chooseBotAction } from './bot'
import { resolveScenario, SCENARIOS } from './scenarios'

const board = (text: string): Cell[] =>
  text
    .replaceAll('/', '')
    .split('')
    .map((c, index) => ({
      index,
      owner: (c === 'X' ? 'P1' : c === 'O' ? 'P2' : null) as PlayerSlot | null,
      effects: [],
    }))

const decide = (text: string, deck: DeckSlot[] = [], abilityChance = 0) =>
  chooseBotAction({
    cells: board(text),
    shieldOwners: {},
    me: 'P2',
    deck,
    silenced: false,
    random: () => 0,
    abilityChance,
  })

describe('chooseBotAction', () => {
  it('ganha quando dá', () => {
    expect(decide('OOO./XX../X.../....')).toEqual({ kind: 'MOVE', cell: 3 })
  })

  it('bloqueia a vitória do oponente', () => {
    expect(decide('XXX./O.../..../....')).toEqual({ kind: 'MOVE', cell: 3 })
  })

  it('senão, prefere o centro', () => {
    expect(decide('..../..../..../....')).toEqual({ kind: 'MOVE', cell: 5 })
  })

  it('usa habilidade quando sorteia, com alvo válido', () => {
    const deck: DeckSlot[] = [{ ability: 'BOMBA', source: 'INITIAL', usedThisRound: false }]
    expect(decide('X.../..../..../....', deck, 1)).toEqual({
      kind: 'ABILITY',
      ability: 'BOMBA',
      targetCell: 0,
    })
  })

  it('não usa habilidade já gasta nem sem alvo', () => {
    const used: DeckSlot[] = [{ ability: 'BOMBA', source: 'INITIAL', usedThisRound: true }]
    expect(decide('X.../..../..../....', used, 1)).toMatchObject({ kind: 'MOVE' })
    const noTarget: DeckSlot[] = [{ ability: 'BOMBA', source: 'INITIAL', usedThisRound: false }]
    expect(decide('..../..../..../....', noTarget, 1)).toMatchObject({ kind: 'MOVE' })
  })
})

describe('resolveScenario', () => {
  it('?cenario= na URL tem prioridade sobre a variável de ambiente', () => {
    expect(resolveScenario('?cenario=wo', 'vitoria')).toBe(SCENARIOS.wo)
    expect(resolveScenario('', 'vitoria')).toBe(SCENARIOS.vitoria)
    expect(resolveScenario('', undefined)).toBe(SCENARIOS.normal)
    expect(resolveScenario('?cenario=inexistente', 'outro')).toBe(SCENARIOS.normal)
  })
})
