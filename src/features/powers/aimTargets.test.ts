import { describe, expect, it } from 'vitest'
import type { Cell } from '../../types/game'
import { adjacentAimCells, getAimTargets } from './aimTargets'

const cells = (owners: Cell['owner'][]): Cell[] =>
  owners.map((owner, index) => ({ index, owner, effects: [] }))

describe('aimTargets (FE-27)', () => {
  it('calcula adjacências com diagonais sem atravessar as bordas', () => {
    expect(adjacentAimCells(0)).toEqual([1, 4, 5])
    expect(adjacentAimCells(5)).toEqual([0, 1, 2, 4, 6, 8, 9, 10])
  })

  it('mira apenas peças do oponente ou do próprio jogador', () => {
    const board = cells(['P1', 'P2', null, 'P1', ...Array(12).fill(null)])
    expect(getAimTargets(board, 'BOMBA', 'P1', null)).toEqual([1])
    expect(getAimTargets(board, 'REFORCO', 'P1', null)).toEqual([0, 3])
  })

  it('não oferece peças reforçadas para Bomba, Tornado ou Buraco Negro', () => {
    const board = cells(['P2', 'P2', 'P2', ...Array(13).fill(null)])
    board[0].effects = [{ kind: 'REFORCO', turnsLeft: 2 }]

    for (const ability of ['BOMBA', 'TORNADO', 'BURACO_NEGRO'] as const) {
      expect(getAimTargets(board, ability, 'P1', null)).not.toContain(0)
      expect(getAimTargets(board, ability, 'P1', null)).toContain(1)
    }
  })

  it('Congelar ainda pode mirar peça reforçada', () => {
    const board = cells(['P2', ...Array(15).fill(null)])
    board[0].effects = [{ kind: 'REFORCO', turnsLeft: 2 }]

    expect(getAimTargets(board, 'CONGELAR', 'P1', null)).toEqual([0])
  })

  it('mira casa vazia sem Escudo e destinos vizinhos livres', () => {
    const board = cells([null, null, 'P1', ...Array(13).fill(null)])
    board[1].effects = [{ kind: 'ESCUDO', turnsLeft: 2 }]
    expect(getAimTargets(board, 'ESCUDO', 'P1', null)).not.toContain(1)
    expect(getAimTargets(board, 'TROCA_RAPIDA', 'P1', 2)).toEqual([3, 5, 6, 7])
  })

  it('não deixa selecionar peça sem destino vizinho para Tornado ou Troca Rápida', () => {
    const board = cells([
      null,
      null,
      null,
      null,
      null,
      'P1',
      'P2',
      'P1',
      null,
      'P1',
      'P2',
      'P1',
      null,
      'P1',
      'P2',
      'P1',
    ])

    expect(getAimTargets(board, 'TORNADO', 'P1', null)).not.toContain(10)
    expect(getAimTargets(board, 'TROCA_RAPIDA', 'P2', null)).not.toContain(10)
    expect(getAimTargets(board, 'TORNADO', 'P1', null)).toContain(6)
  })

  it('ignora vizinha com Escudo ao validar destinos possíveis', () => {
    const board = cells(['P2', ...Array(15).fill(null)])
    board[1].effects = [{ kind: 'ESCUDO', turnsLeft: 1 }]
    board[4].effects = [{ kind: 'ESCUDO', turnsLeft: 1 }]
    board[5].effects = [{ kind: 'ESCUDO', turnsLeft: 1 }]

    expect(getAimTargets(board, 'TORNADO', 'P1', null)).not.toContain(0)
  })

  it('não oferece alvos para habilidades sem alvo', () => {
    expect(getAimTargets(cells(Array(16).fill(null)), 'SILENCIO', 'P1', null)).toEqual([])
  })
})
