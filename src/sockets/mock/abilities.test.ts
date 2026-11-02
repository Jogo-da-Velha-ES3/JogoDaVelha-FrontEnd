import { describe, expect, it } from 'vitest'
import type { AbilityId, Cell, PlayerSlot } from '../../types/game'
import { isBlockedFor, resolveAbility, tickEffects } from './abilities'

/** X = P1, O = P2, x/o = congelada, R = P1 com Reforço, . = vazia (16 casas, sem "/") */
function board(text: string): Cell[] {
  return text
    .replaceAll('/', '')
    .split('')
    .map((c, index) => ({
      index,
      owner: ('XxR'.includes(c) ? 'P1' : 'Oo'.includes(c) ? 'P2' : null) as PlayerSlot | null,
      effects:
        c === 'x' || c === 'o'
          ? [{ kind: 'CONGELAR' as const, turnsLeft: 2 }]
          : c === 'R'
            ? [{ kind: 'REFORCO' as const, turnsLeft: 2 }]
            : [],
    }))
}

const use = (
  cells: Cell[],
  ability: AbilityId,
  extra: { actor?: PlayerSlot; target?: number; destination?: number; forceField?: number } = {},
) =>
  resolveAbility({
    cells,
    shieldOwners: {},
    actor: extra.actor ?? 'P2',
    ability,
    targetCell: extra.target,
    destinationCell: extra.destination,
    opponentForceField: extra.forceField ?? 0,
    random: () => 0,
  })

describe('resolveAbility', () => {
  it('Bomba remove a peça do oponente', () => {
    const result = use(board('X.../..../..../....'), 'BOMBA', { target: 0 })
    expect(result.ok && result.cells[0].owner).toBeNull()
  })

  it('Bomba em peça com Reforço fica sem efeito', () => {
    const result = use(board('R.../..../..../....'), 'BOMBA', { target: 0 })
    expect(result).toMatchObject({ ok: true, noEffect: true })
    expect(result.ok && result.cells[0].owner).toBe('P1')
  })

  it('alvo errado é recusado', () => {
    expect(use(board('O.../..../..../....'), 'BOMBA', { target: 0 })).toMatchObject({
      ok: false,
      code: 'INVALID_TARGET',
    })
    expect(use(board('X.../..../..../....'), 'ESCUDO', { target: 0 })).toMatchObject({ ok: false })
  })

  it('Escudo bloqueia a casa só para o oponente de quem o colocou', () => {
    const result = use(board('..../..../..../....'), 'ESCUDO', { target: 5 })
    if (!result.ok) throw new Error('esperava ok')
    expect(result.cells[5].effects).toEqual([{ kind: 'ESCUDO', turnsLeft: 2 }])
    expect(isBlockedFor(result.cells, result.shieldOwners, 5, 'P1')).toBe(true)
    expect(isBlockedFor(result.cells, result.shieldOwners, 5, 'P2')).toBe(false)
  })

  it('Congelar e Reforço põem o efeito com contador 2', () => {
    const frozen = use(board('X.../..../..../....'), 'CONGELAR', { target: 0 })
    expect(frozen.ok && frozen.cells[0].effects).toEqual([{ kind: 'CONGELAR', turnsLeft: 2 }])
    const reinforced = use(board('O.../..../..../....'), 'REFORCO', { target: 0 })
    expect(reinforced.ok && reinforced.cells[0].effects).toEqual([
      { kind: 'REFORCO', turnsLeft: 2 },
    ])
  })

  it('Tornado leva a peça para a casa vizinha escolhida, com os efeitos junto', () => {
    const result = use(board('x.../..../..../....'), 'TORNADO', { target: 0, destination: 5 })
    if (!result.ok) throw new Error('esperava ok')
    expect(result.cells[0].owner).toBeNull()
    expect(result.cells[5]).toMatchObject({ owner: 'P1', effects: [{ kind: 'CONGELAR' }] })
    expect(result.destinationCell).toBe(5)
  })

  it('Tornado com destino que não é vizinho é recusado', () => {
    expect(
      use(board('X.../..../..../....'), 'TORNADO', { target: 0, destination: 15 }),
    ).toMatchObject({ ok: false, code: 'INVALID_DESTINATION' })
  })

  it('Tornado e Troca Rápida sem casa vizinha livre ficam sem efeito [RN-ARN-05]', () => {
    const cornered = board('XO../OO../..../....')
    expect(use(cornered, 'TORNADO', { target: 0 })).toMatchObject({ ok: true, noEffect: true })
    expect(use(cornered, 'TROCA_RAPIDA', { target: 1 })).toMatchObject({ ok: true })
  })

  it('Buraco Negro manda a peça para uma casa vazia qualquer', () => {
    const result = use(board('X.../..../..../....'), 'BURACO_NEGRO', { target: 0 })
    if (!result.ok) throw new Error('esperava ok')
    expect(result.cells[0].owner).toBeNull()
    expect(result.cells.filter((c) => c.owner === 'P1')).toHaveLength(1)
  })

  it('Campo de Força anula a ofensiva, mas não as defensivas [RN-ARN-04]', () => {
    const cells = board('X..O/..../..../....')
    const bomb = use(cells, 'BOMBA', { target: 0, forceField: 2 })
    expect(bomb).toMatchObject({ ok: true, absorbed: true })
    expect(bomb.ok && bomb.cells[0].owner).toBe('P1')
    expect(use(cells, 'REFORCO', { target: 3, forceField: 2 })).toMatchObject({ absorbed: false })
  })

  it('Ampulheta, Silêncio e Campo de Força afetam os jogadores, não as casas', () => {
    const cells = board('..../..../..../....')
    expect(use(cells, 'AMPULHETA')).toMatchObject({ hourglassFor: 'P1', targetCell: null })
    expect(use(cells, 'SILENCIO')).toMatchObject({ silence: 'P1' })
    expect(use(cells, 'CAMPO_DE_FORCA')).toMatchObject({ forceFieldFor: 'P2' })
  })
})

describe('tickEffects [RN-ARN-07]', () => {
  it('contadores caem 1 e o efeito some no 0, levando o dono do Escudo junto', () => {
    const shield = use(board('..../..../..../....'), 'ESCUDO', { target: 2 })
    if (!shield.ok) throw new Error('esperava ok')
    const once = tickEffects(shield.cells, shield.shieldOwners)
    expect(once.cells[2].effects).toEqual([{ kind: 'ESCUDO', turnsLeft: 1 }])
    expect(once.shieldOwners[2]).toBe('P2')
    const twice = tickEffects(once.cells, once.shieldOwners)
    expect(twice.cells[2].effects).toEqual([])
    expect(twice.shieldOwners[2]).toBeUndefined()
  })
})
