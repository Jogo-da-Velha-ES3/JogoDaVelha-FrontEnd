import { render } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { CHARACTER_INFO } from '../../../constants/characters'
import { ABILITIES } from '../../../constants/game'
import type { AbilityId, PlayerSlot } from '../../../types/game'
import { Board } from '../../board'
import { abilityDemo, type DemoOutcome } from './abilityDemo'
import { cellStepPercent, movesPiece } from './effectGeometry'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => reduced.value,
}))

/** Tabuleiro de demonstração (X é o P1, O é o P2) logo depois da habilidade */
function renderDemo(ability: AbilityId, by: PlayerSlot = 'P1', outcome: DemoOutcome = 'APPLIED') {
  const { cells, result } = abilityDemo(ability, by, outcome)
  const view = render(
    <Board
      cells={cells}
      characters={{ P1: 'X', P2: 'O' }}
      impact={{ ...result, serverTime: 1, receivedAt: 1 }}
    />,
  )
  const effect = view.container.querySelector<HTMLElement>('[data-layer="ability-effect"]')
  const piece = (cell: number) => view.container.querySelector(`[data-cell="${cell}"] svg`)
  return { ...view, effect, piece }
}

beforeAll(() => {
  MotionGlobalConfig.instantAnimations = true
})

afterAll(() => {
  MotionGlobalConfig.instantAnimations = false
})

afterEach(() => {
  reduced.value = false
})

describe('AbilityEffect (FE-47)', () => {
  it('cada habilidade tem a sua animação, na cor de quem usou', () => {
    for (const ability of ABILITIES) {
      for (const [by, character] of [
        ['P1', 'X'],
        ['P2', 'O'],
      ] as const) {
        const { effect, unmount } = renderDemo(ability, by)
        expect(effect).toHaveAttribute('data-ability', ability)
        expect(effect).toHaveAttribute('data-outcome', 'applied')
        expect(effect).toHaveStyle({ color: CHARACTER_INFO[character].color })
        expect(effect?.childElementCount).toBeGreaterThan(0)
        unmount()
      }
    }
  })

  it('anulada fica na cor de quem tinha o Campo de Força; sem efeito, neutra', () => {
    const absorbed = renderDemo('BOMBA', 'P1', 'ABSORBED')
    expect(absorbed.effect).toHaveAttribute('data-outcome', 'absorbed')
    expect(absorbed.effect).toHaveStyle({ color: CHARACTER_INFO.O.color })
    absorbed.unmount()

    const noEffect = renderDemo('TORNADO', 'P1', 'NO_EFFECT')
    expect(noEffect.effect).toHaveAttribute('data-outcome', 'no-effect')
    expect(noEffect.effect?.style.color).toBe('var(--color-text-muted)')
  })

  it('peça movida fica escondida no destino até a animação levá-la', () => {
    const { piece, effect } = renderDemo('TORNADO')
    expect(piece(2)).toHaveClass('opacity-0')
    expect(piece(5)).not.toHaveClass('opacity-0')
    expect(effect?.querySelector('[data-ability]')).toBeNull() // a peça voa; não é o ícone parado
  })

  it('com "reduzir movimento", só o ícone aparece e a peça já fica no destino', () => {
    reduced.value = true
    const { piece, effect } = renderDemo('TORNADO')
    expect(piece(2)).not.toHaveClass('opacity-0')
    expect(effect?.querySelectorAll('[data-ability]')).toHaveLength(1)
    expect(effect?.querySelector('[data-ability]')).toHaveAttribute('data-ability', 'TORNADO')
  })
})

describe('geometria e demonstração', () => {
  it('passo entre casas vizinhas: a casa mais o espaço, em % da casa', () => {
    expect(cellStepPercent(4)).toBeCloseTo(108.51, 1)
  })

  it('só Tornado, Buraco Negro e Troca Rápida com efeito levam a peça', () => {
    const resolved = (ability: AbilityId, outcome: DemoOutcome = 'APPLIED') => ({
      ...abilityDemo(ability, 'P1', outcome).result,
      serverTime: 1,
      receivedAt: 1,
    })
    expect(movesPiece(resolved('TORNADO'))).toBe(true)
    expect(movesPiece(resolved('BURACO_NEGRO'))).toBe(true)
    expect(movesPiece(resolved('TROCA_RAPIDA'))).toBe(true)
    expect(movesPiece(resolved('BOMBA'))).toBe(false)
    expect(movesPiece(resolved('TORNADO', 'ABSORBED'))).toBe(false)
    expect(movesPiece(resolved('TORNADO', 'NO_EFFECT'))).toBe(false)
  })

  it('o tabuleiro da demonstração mostra o estado depois da habilidade', () => {
    expect(abilityDemo('BOMBA', 'P1').cells[6].owner).toBeNull()
    const tornado = abilityDemo('TORNADO', 'P2').cells
    expect([tornado[6].owner, tornado[2].owner]).toEqual([null, 'P1'])
    expect(abilityDemo('BOMBA', 'P1', 'ABSORBED').cells[6].owner).toBe('P2')
    expect(abilityDemo('CONGELAR', 'P1').cells[10].effects).toEqual([
      { kind: 'CONGELAR', turnsLeft: 2 },
    ])
  })
})
