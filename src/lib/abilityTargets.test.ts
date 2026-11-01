import { describe, expect, it } from 'vitest'
import type { Cell, CellEffectKind } from '../types/game'
import { adjacentCells, getAimTargets } from './abilityTargets'

/** Tabuleiro a partir de 'X' (P1), 'O' (P2) e '.' (vazia); barras e espaços são ignorados */
const board = (layout: string, effects: Record<number, CellEffectKind> = {}): Cell[] =>
  [...layout.replace(/[/\s]/g, '')].map((char, index) => ({
    index,
    owner: char === 'X' ? 'P1' : char === 'O' ? 'P2' : null,
    effects: effects[index] ? [{ kind: effects[index], turnsLeft: 2 }] : [],
  }))

describe('adjacentCells', () => {
  it('inclui as diagonais sem atravessar as bordas', () => {
    expect(adjacentCells(0)).toEqual([1, 4, 5])
    expect(adjacentCells(5)).toEqual([0, 1, 2, 4, 6, 8, 9, 10])
  })
})

describe('getAimTargets (FE-27)', () => {
  it('mira a peça do oponente ou a própria, conforme a habilidade', () => {
    const cells = board('XO.X/..../..../....')
    expect(getAimTargets(cells, 'BOMBA', 'P1', null)).toEqual([1])
    expect(getAimTargets(cells, 'REFORCO', 'P1', null)).toEqual([0, 3])
  })

  it('peça com Reforço não é alvo de Bomba, Tornado nem Buraco Negro', () => {
    const cells = board('OOO./..../..../....', { 0: 'REFORCO' })
    for (const ability of ['BOMBA', 'TORNADO', 'BURACO_NEGRO'] as const) {
      expect(getAimTargets(cells, ability, 'P1', null)).not.toContain(0)
      expect(getAimTargets(cells, ability, 'P1', null)).toContain(1)
    }
  })

  it('Congelar ainda pode mirar a peça com Reforço', () => {
    expect(
      getAimTargets(board('O.../..../..../....', { 0: 'REFORCO' }), 'CONGELAR', 'P1', null),
    ).toEqual([0])
  })

  it('Escudo mira casa vazia sem outro Escudo', () => {
    const cells = board('X.../..../..../....', { 1: 'ESCUDO' })
    const targets = getAimTargets(cells, 'ESCUDO', 'P1', null)
    expect(targets).not.toContain(0)
    expect(targets).not.toContain(1)
    expect(targets).toContain(2)
  })

  it('no destino, só casas vizinhas livres da peça escolhida', () => {
    const cells = board('..X./..../..../....', { 1: 'ESCUDO' })
    expect(getAimTargets(cells, 'TROCA_RAPIDA', 'P1', 2)).toEqual([3, 5, 6, 7])
  })

  it('peça sem vizinha livre (ou só com Escudo) não é alvo de Tornado nem Troca Rápida', () => {
    const cells = board('..../.XOX/.XOX/.XOX')
    expect(getAimTargets(cells, 'TORNADO', 'P1', null)).not.toContain(10)
    expect(getAimTargets(cells, 'TROCA_RAPIDA', 'P2', null)).not.toContain(10)
    expect(getAimTargets(cells, 'TORNADO', 'P1', null)).toContain(6)

    const shielded = board('O.../..../..../....', { 1: 'ESCUDO', 4: 'ESCUDO', 5: 'ESCUDO' })
    expect(getAimTargets(shielded, 'TORNADO', 'P1', null)).toEqual([])
  })

  it('sem alvo: habilidade sem alvo ou tabuleiro sem peça do oponente', () => {
    const empty = board('..../..../..../....')
    expect(getAimTargets(empty, 'SILENCIO', 'P1', null)).toEqual([])
    expect(getAimTargets(empty, 'BOMBA', 'P1', null)).toEqual([])
  })
})
