// O que o jogador da vez ainda pode fazer no turno (BE-046): 1 jogada e 1 habilidade, em qualquer
// ordem e no mesmo prazo. Lógica pura, só para a interface: quem decide se a ação vale e quando o
// turno acaba é o servidor.
import type { TurnActions } from '../types/game'

/**
 * - BOTH: nada feito ainda, as duas ações liberadas
 * - MOVE_LEFT / ABILITY_LEFT: falta só uma
 * - NOTHING_LEFT: fez uma e a outra não dá (silenciado, sem habilidade livre): só passar a vez
 * - CLOSED: fez as duas, o servidor fecha o turno
 */
export type TurnStep = 'BOTH' | 'MOVE_LEFT' | 'ABILITY_LEFT' | 'NOTHING_LEFT' | 'CLOSED'

export interface TurnStepInput {
  actions: TurnActions
  /** Silenciado neste turno: não usa habilidade [RF-ARN-03] */
  silenced: boolean
  /** Alguma carta do deck ainda sem uso no round e com alvo */
  abilityLeft: boolean
}

export function turnStep({ actions, silenced, abilityLeft }: TurnStepInput): TurnStep {
  if (actions.moveUsed && actions.abilityUsed) return 'CLOSED'
  const canMove = !actions.moveUsed
  const canUseAbility = !actions.abilityUsed && !silenced && abilityLeft
  if (canMove && canUseAbility) return 'BOTH'
  if (canMove) return 'MOVE_LEFT'
  if (canUseAbility) return 'ABILITY_LEFT'
  return 'NOTHING_LEFT'
}

/** Passar a vez só depois de agir no turno, e antes de o servidor fechá-lo (regra proposta ao back) */
export function canEndTurn(actions: TurnActions): boolean {
  return (actions.moveUsed || actions.abilityUsed) && !(actions.moveUsed && actions.abilityUsed)
}
