import type { ReactNode } from 'react'
import type { AbilityId } from '../../types/game'

/**
 * Ícone de cada habilidade no carrossel do Como Jogar (FE-34).
 *
 * TODO: os ícones entram depois. Para incluir um, basta preencher a entrada da habilidade com o
 * elemento (por exemplo `BOMBA: <img src={...} alt="" />` ou um SVG): ele ocupa todo o espaço
 * reservado do item (`AbilityIconSlot`), sem mudar o layout. Habilidade sem entrada mostra o
 * marcador neutro. Não depende de onde o ícone vem.
 */
export const ABILITY_ICONS: Partial<Record<AbilityId, ReactNode>> = {}
