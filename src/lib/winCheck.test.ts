import { describe, expect, it } from 'vitest'
import type { Cell, CellEffectKind, PlayerSlot } from '../types/game'
import { evaluateBoard, findWinningLine, winningLines } from './winCheck'

/**
 * Monta o tabuleiro a partir de texto, uma linha por "/":
 * X/O = peça do P1/P2 · x/o = peça congelada · R = peça do P1 com Reforço · E = Escudo · . = vazia
 */
function board(rows: string): Cell[] {
  const chars = rows.split('/').join('').split('')
  return chars.map((char, index) => {
    const owner: PlayerSlot | null = 'XxR'.includes(char) ? 'P1' : 'Oo'.includes(char) ? 'P2' : null
    const effects: { kind: CellEffectKind; turnsLeft: number }[] = []
    if ('xo'.includes(char)) effects.push({ kind: 'CONGELAR', turnsLeft: 2 })
    if (char === 'R') effects.push({ kind: 'REFORCO', turnsLeft: 2 })
    if (char === 'E') effects.push({ kind: 'ESCUDO', turnsLeft: 2 })
    return { index, owner, effects }
  })
}

const EMPTY = '..../..../..../....'

/** Tabuleiro 4×4 só com as casas da linha ocupadas pelo jogador */
function boardWithLine(line: readonly number[], char: 'X' | 'O'): Cell[] {
  const cells = EMPTY.replaceAll('/', '').split('')
  line.forEach((i) => (cells[i] = char))
  return board(cells.join(''))
}

describe('winningLines', () => {
  it('4×4 com 4 em linha tem 10 linhas: 4 linhas, 4 colunas e 2 diagonais', () => {
    const lines = winningLines(4, 4)
    expect(lines).toHaveLength(10)
    expect(lines).toContainEqual([0, 1, 2, 3])
    expect(lines).toContainEqual([12, 13, 14, 15])
    expect(lines).toContainEqual([0, 4, 8, 12])
    expect(lines).toContainEqual([3, 7, 11, 15])
    expect(lines).toContainEqual([0, 5, 10, 15])
    expect(lines).toContainEqual([3, 6, 9, 12])
  })

  it.each([
    [3, 3, 8],
    [5, 4, 28],
    [4, 3, 24],
  ])('tabuleiro %i×%i com %i em linha tem %i linhas', (size, length, expected) => {
    expect(winningLines(size, length)).toHaveLength(expected)
  })

  it('nenhuma linha sai do tabuleiro nem repete casa', () => {
    for (const line of winningLines(5, 4)) {
      expect(new Set(line).size).toBe(4)
      line.forEach((i) => expect(i).toBeGreaterThanOrEqual(0))
      line.forEach((i) => expect(i).toBeLessThan(25))
    }
  })
})

describe('findWinningLine', () => {
  it.each(winningLines(4, 4).map((line) => [line.join(','), line]))(
    'detecta a linha %s para os dois jogadores',
    (_, line) => {
      expect(findWinningLine(boardWithLine(line, 'X'), 'P1')).toEqual(line)
      expect(findWinningLine(boardWithLine(line, 'O'), 'P2')).toEqual(line)
      expect(findWinningLine(boardWithLine(line, 'X'), 'P2')).toBeNull()
    },
  )

  it('3 peças não vencem', () => {
    expect(findWinningLine(board('XXX./..../..../....'), 'P1')).toBeNull()
  })

  it('peça do oponente no meio corta a linha', () => {
    expect(findWinningLine(board('XXOX/..../..../....'), 'P1')).toBeNull()
  })

  it('peça congelada não forma linha [RN-ARN-08]', () => {
    expect(findWinningLine(board('XXxX/..../..../....'), 'P1')).toBeNull()
    expect(findWinningLine(board('o.../.O../..O./...O'), 'P2')).toBeNull()
  })

  it('peça com Reforço conta normalmente', () => {
    expect(findWinningLine(board('XRXX/..../..../....'), 'P1')).toEqual([0, 1, 2, 3])
  })

  it('casa com Escudo é vazia: não conta para ninguém', () => {
    expect(findWinningLine(board('XXEX/..../..../....'), 'P1')).toBeNull()
  })

  it('tabuleiro que não é quadrado dá erro', () => {
    expect(() => findWinningLine(board('XXX/XX'), 'P1')).toThrow(/quadrado/)
    expect(() => findWinningLine([], 'P1')).toThrow(/quadrado/)
  })
})

describe('evaluateBoard', () => {
  it('tabuleiro vazio: o jogo segue', () => {
    expect(evaluateBoard(board(EMPTY), 'P1')).toBeNull()
  })

  it('vitória com a linha vencedora', () => {
    expect(evaluateBoard(board('X.../X.../X.../X...'), 'P1')).toEqual({
      kind: 'WIN',
      winner: 'P1',
      line: [0, 4, 8, 12],
    })
  })

  it('verifica quem agiu antes do oponente [RN-ARN-08]', () => {
    // Os dois com linha (ex: o congelamento de uma peça expirou): vence quem agiu
    const both = board('XXXX/OOOO/..../....')
    expect(evaluateBoard(both, 'P1')).toMatchObject({ kind: 'WIN', winner: 'P1' })
    expect(evaluateBoard(both, 'P2')).toMatchObject({ kind: 'WIN', winner: 'P2' })
  })

  it('o oponente vence se só ele tem linha, mesmo sem ter agido', () => {
    expect(evaluateBoard(board('OOOO/X.../X.../....'), 'P1')).toMatchObject({
      kind: 'WIN',
      winner: 'P2',
    })
  })

  it('tabuleiro cheio sem linha é empate [RF-ARN-04]', () => {
    expect(evaluateBoard(board('XXOO/OOXX/XXOO/OOXX'), 'P1')).toEqual({ kind: 'DRAW' })
  })

  it('tabuleiro cheio com linha é vitória, não empate', () => {
    expect(evaluateBoard(board('XXXX/OOXO/XOOX/OXOO'), 'P2')).toMatchObject({
      kind: 'WIN',
      winner: 'P1',
    })
  })

  it('tabuleiro cheio com a única linha congelada é empate', () => {
    expect(evaluateBoard(board('XXxX/OOXO/XOOX/OXOO'), 'P1')).toEqual({ kind: 'DRAW' })
  })

  it('casa com Escudo não deixa o tabuleiro cheio', () => {
    expect(evaluateBoard(board('XXOO/OOXX/XXOO/OOXE'), 'P1')).toBeNull()
  })
})
