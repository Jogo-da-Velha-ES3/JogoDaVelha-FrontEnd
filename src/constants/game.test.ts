import { describe, expect, it } from 'vitest'
import { ABILITY_INFO } from './abilities'
import { CHARACTER_INFO } from './characters'
import {
  ABILITIES,
  CHARACTERS,
  DECK_SIZE,
  INITIAL_ABILITIES_TO_PICK,
  STARTER_ABILITIES,
  STARTER_CHARACTERS,
} from './game'

describe('constantes do jogo', () => {
  it('tem as 10 habilidades da ERS, cada uma com descrição', () => {
    expect(ABILITIES).toHaveLength(10)
    expect(Object.keys(ABILITY_INFO).sort()).toEqual([...ABILITIES].sort())
  })

  it('deck = habilidades iniciais + 1 sorteada', () => {
    expect(DECK_SIZE).toBe(INITIAL_ABILITIES_TO_PICK + 1)
  })

  it('jogador novo tem habilidades suficientes para montar o deck', () => {
    expect(STARTER_ABILITIES.length).toBeGreaterThanOrEqual(INITIAL_ABILITIES_TO_PICK)
    STARTER_ABILITIES.forEach((ability) => expect(ABILITIES).toContain(ability))
  })

  it('X e O são grátis e os outros personagens são pagos', () => {
    expect(Object.keys(CHARACTER_INFO).sort()).toEqual([...CHARACTERS].sort())
    CHARACTERS.forEach((id) => {
      const free = (STARTER_CHARACTERS as readonly string[]).includes(id)
      expect(CHARACTER_INFO[id].price === 0).toBe(free)
    })
  })

  it('só habilidades ofensivas são anuladas pelo Campo de Força', () => {
    Object.values(ABILITY_INFO).forEach((info) => {
      expect(info.blockedByForceField).toBe(info.kind === 'OFENSIVA')
    })
  })
})
