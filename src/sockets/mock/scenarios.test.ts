import { describe, expect, it } from 'vitest'
import { resolveScenario, SCENARIOS } from './scenarios'

describe('SCENARIOS', () => {
  it('cada cenário tem o id igual à sua chave', () => {
    for (const [key, scenario] of Object.entries(SCENARIOS)) expect(scenario.id).toBe(key)
  })

  it('?cenario= encontra os cenários de derrota (FE-15)', () => {
    expect(resolveScenario('?cenario=derrota')).toBe(SCENARIOS.derrota)
    expect(resolveScenario('?cenario=derrota-wo')).toBe(SCENARIOS['derrota-wo'])
  })

  it('só o derrota-wo deixa você ocioso', () => {
    const idle = Object.values(SCENARIOS).filter((s) => s.youIdle)
    expect(idle.map((s) => s.id)).toEqual(['derrota-wo'])
  })
})
