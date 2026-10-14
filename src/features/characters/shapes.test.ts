import { describe, expect, it } from 'vitest'
import { roundedPolygonPath, starPoints, tint } from './shapes'

describe('tint', () => {
  it('mistura com branco', () => {
    expect(tint('#b07cff', 0)).toBe('#b07cff')
    expect(tint('#b07cff', 1)).toBe('#ffffff')
    expect(tint('#000000', 0.5)).toBe('#808080')
  })
})

describe('starPoints', () => {
  it('alterna raio externo e interno, com a primeira ponta para cima', () => {
    const pts = starPoints(0, 0, 10, 4)
    expect(pts).toHaveLength(10)
    expect(pts[0][0]).toBeCloseTo(0)
    expect(pts[0][1]).toBeCloseTo(-10)
    expect(Math.hypot(...pts[1])).toBeCloseTo(4)
  })
})

describe('roundedPolygonPath', () => {
  it('gera um path fechado com uma curva por canto', () => {
    const d = roundedPolygonPath(
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      2,
    )
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d.match(/Q/g)).toHaveLength(4)
  })

  it('não passa do meio da aresta com raio grande demais', () => {
    const d = roundedPolygonPath(
      [
        [0, 0],
        [4, 0],
        [4, 4],
      ],
      100,
    )
    expect(d).not.toMatch(/NaN|-?\d{3,}/)
  })
})
