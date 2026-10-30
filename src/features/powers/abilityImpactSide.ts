import { otherSlot } from '../../lib/match'
import type { ResolvedAbility } from '../../stores/boardStore'
import type { PlayerSlot } from '../../types/game'

/**
 * De que lado é a cor do efeito e do aviso de uma habilidade (decidido em 29/10, FE-27): de quem
 * usou; anulada, de quem tinha o Campo de Força; sem efeito, nenhum (cor neutra).
 */
export function abilityImpactSide(result: ResolvedAbility): PlayerSlot | null {
  if (result.noEffect) return null
  return result.absorbed ? otherSlot(result.by) : result.by
}
