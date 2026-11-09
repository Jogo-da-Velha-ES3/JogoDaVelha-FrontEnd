import { describe, expect, it } from 'vitest'
import { ABILITY_INFO } from '../../constants/abilities'
import { ABILITIES, COINS_REWARD } from '../../constants/game'
import { HOW_TO_PLAY_ABILITY_ORDER, HOW_TO_PLAY_PAGES } from './howToPlayTexts'

describe('howToPlayTexts', () => {
  it('o carrossel tem as 10 habilidades, uma vez cada', () => {
    expect(HOW_TO_PLAY_ABILITY_ORDER).toHaveLength(ABILITIES.length)
    expect([...HOW_TO_PLAY_ABILITY_ORDER].sort()).toEqual([...ABILITIES].sort())
  })

  it('agrupa por tipo (ofensivas, defensivas, movimento) na ordem do catálogo', () => {
    expect(HOW_TO_PLAY_ABILITY_ORDER).toEqual([
      'BOMBA',
      'AMPULHETA',
      'TORNADO',
      'BURACO_NEGRO',
      'CONGELAR',
      'SILENCIO',
      'ESCUDO',
      'CAMPO_DE_FORCA',
      'REFORCO',
      'TROCA_RAPIDA',
    ])
    expect(HOW_TO_PLAY_ABILITY_ORDER.map((id) => ABILITY_INFO[id].kind)).toEqual([
      ...Array<string>(6).fill('OFENSIVA'),
      ...Array<string>(3).fill('DEFENSIVA'),
      'MOVIMENTO',
    ])
  })

  it('as páginas têm ids únicos e só a de habilidades usa o carrossel', () => {
    const ids = HOW_TO_PLAY_PAGES.map((page) => page.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(HOW_TO_PLAY_PAGES.filter((page) => page.visual === 'deck')).toHaveLength(1)
  })

  it('os destaques ** sempre fecham', () => {
    const unclosed = HOW_TO_PLAY_PAGES.flatMap((page) => page.points).filter(
      (point) => point.split('**').length % 2 === 0,
    )
    expect(unclosed).toEqual([])
  })

  it('a tabela de Coins traz os 5 resultados com os valores das constantes', () => {
    const rows = HOW_TO_PLAY_PAGES.find((page) => page.id === 'coins')?.coinRows ?? []
    expect(rows.map((row) => row.amount).sort((a, b) => a - b)).toEqual(
      Object.values(COINS_REWARD).sort((a, b) => a - b),
    )
  })
})
