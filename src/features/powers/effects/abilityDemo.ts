// Cenário de demonstração dos efeitos (FE-47): um tabuleiro de exemplo e o resultado de cada
// habilidade nele, como o servidor mandaria. Usado na vitrine; serve também para a demonstração em
// loop da Loja (FE-31). Nada aqui decide jogada: é só exemplo.
import { otherSlot } from '../../../lib/match'
import type { ResolvedAbility } from '../../../stores/boardStore'
import type { AbilityId, Cell, CellEffectKind, PlayerSlot } from '../../../types/game'
import { BOARD_CELLS, EFFECT_DURATION_TURNS } from '../../../constants/game'

export type DemoOutcome = 'APPLIED' | 'ABSORBED' | 'NO_EFFECT'

export interface AbilityDemo {
  /** Tabuleiro depois da habilidade (o servidor manda o estado final junto com o resultado) */
  cells: Cell[]
  result: Omit<ResolvedAbility, 'serverTime' | 'receivedAt'>
}

// Peças de quem usa e do oponente, sempre nas mesmas casas
const USER_CELLS = [0, 5, 13]
const OPPONENT_CELLS = [6, 9, 10]

// Alvo e destino de cada habilidade nesse tabuleiro
const DEMO: Record<
  AbilityId,
  { target: number | null; destination?: number; effect?: CellEffectKind }
> = {
  BOMBA: { target: 6 },
  ESCUDO: { target: 3, effect: 'ESCUDO' },
  AMPULHETA: { target: null },
  TORNADO: { target: 6, destination: 2 },
  BURACO_NEGRO: { target: 9, destination: 15 },
  CONGELAR: { target: 10, effect: 'CONGELAR' },
  CAMPO_DE_FORCA: { target: null },
  SILENCIO: { target: null },
  TROCA_RAPIDA: { target: 5, destination: 4 },
  REFORCO: { target: 0, effect: 'REFORCO' },
}

/** Tabuleiro de exemplo e o resultado da habilidade usada por `by` */
export function abilityDemo(
  ability: AbilityId,
  by: PlayerSlot,
  outcome: DemoOutcome = 'APPLIED',
): AbilityDemo {
  const owners: (PlayerSlot | null)[] = Array.from({ length: BOARD_CELLS }, () => null)
  for (const i of USER_CELLS) owners[i] = by
  for (const i of OPPONENT_CELLS) owners[i] = otherSlot(by)
  const cells: Cell[] = owners.map((owner, index) => ({ index, owner, effects: [] }))

  const { target, destination, effect } = DEMO[ability]
  const applied = outcome === 'APPLIED'
  if (applied && target !== null) {
    if (ability === 'BOMBA') cells[target] = { ...cells[target], owner: null }
    if (effect)
      cells[target] = {
        ...cells[target],
        effects: [{ kind: effect, turnsLeft: EFFECT_DURATION_TURNS }],
      }
    if (destination !== undefined) {
      cells[destination] = { ...cells[destination], owner: cells[target].owner }
      cells[target] = { ...cells[target], owner: null }
    }
  }

  return {
    cells,
    result: {
      by,
      ability,
      targetCell: target,
      destinationCell: applied ? (destination ?? null) : null,
      absorbed: outcome === 'ABSORBED',
      noEffect: outcome === 'NO_EFFECT',
    },
  }
}
