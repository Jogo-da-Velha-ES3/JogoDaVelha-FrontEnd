import { describe, expect, it } from 'vitest'
import { RESULT_BURST_PARTICLES, RESULT_BURST_SECONDS } from '../../constants/game'
import type { ResultKind } from '../../lib/result'
import { type CelebrationFlavor, celebrationFlavor, makeParticles } from './celebration'

describe('celebrationFlavor: só quem venceu ganha festa', () => {
  it.each<[ResultKind, CelebrationFlavor | null]>([
    ['WIN_FLAWLESS', 'flawless'],
    ['WIN', 'win'],
    ['WO_WIN', 'short'],
    ['LOSS', null],
    ['DRAW', null],
    ['WO_LOSS', null],
  ])('%s → %s', (kind, flavor) => {
    expect(celebrationFlavor(kind)).toBe(flavor)
  })
})

describe('makeParticles', () => {
  const FLAVORS: CelebrationFlavor[] = ['flawless', 'win', 'short']

  it.each(FLAVORS)('%s: sempre a mesma rajada, com o número de partículas combinado', (flavor) => {
    const a = makeParticles(flavor)
    expect(a).toEqual(makeParticles(flavor))
    expect(a).toHaveLength(RESULT_BURST_PARTICLES[flavor])
  })

  it('a impecável tem mais partículas que a comum, e a versão curta tem menos', () => {
    expect(RESULT_BURST_PARTICLES.flawless).toBeGreaterThan(RESULT_BURST_PARTICLES.win)
    expect(RESULT_BURST_PARTICLES.win).toBeGreaterThan(RESULT_BURST_PARTICLES.short)
    expect(RESULT_BURST_PARTICLES.win).toBeGreaterThanOrEqual(20)
    expect(RESULT_BURST_PARTICLES.win).toBeLessThanOrEqual(24)
  })

  it.each(FLAVORS)('%s: toda partícula termina antes de a camada ser desmontada', (flavor) => {
    for (const p of makeParticles(flavor)) {
      expect(p.delay + p.duration).toBeLessThan(RESULT_BURST_SECONDS)
    }
  })

  it.each(FLAVORS)(
    '%s: sai para cima (dy negativo) e dentro do painel (<= 0,5 de --u)',
    (flavor) => {
      for (const p of makeParticles(flavor)) {
        expect(p.dy).toBeLessThan(0)
        expect(Math.abs(p.dx)).toBeLessThanOrEqual(0.5)
        expect(Math.abs(p.dy)).toBeLessThanOrEqual(0.5)
      }
    },
  )

  it('usa as três cores: a do vencedor, o dourado e o branco', () => {
    const tints = new Set(makeParticles('flawless').map((p) => p.tint))
    expect(tints).toEqual(new Set(['side', 'gold', 'white']))
  })
})
