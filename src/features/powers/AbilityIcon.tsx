import { useId } from 'react'
import { GlowContext } from '../characters/glowContext'
import { GlowFilter } from '../characters/NeonTube'
import type { AbilityId } from '../../types/game'
import { ABILITY_ICON_DESIGNS } from './abilityIconDesigns'

interface AbilityIconProps {
  ability: AbilityId
  /** Tamanho fica com quem usa, ex: `size-5` */
  className?: string
}

/**
 * Ícone da habilidade no Estilo A (FE-46). Desenhado em `currentColor`: herda a cor do texto de
 * onde está (cor do personagem na Arena, a principal no resto). Decorativo: o nome fica sempre ao
 * lado.
 */
export function AbilityIcon({ ability, className = 'size-5' }: AbilityIconProps) {
  // O id do useId tem caracteres que quebram o `url(#...)` do filtro
  const glowId = `glow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-ability={ability}
      className={`shrink-0 overflow-visible ${className}`}
    >
      <defs>
        <GlowFilter id={glowId} blur={1.4} soft />
      </defs>
      <GlowContext value={glowId}>{ABILITY_ICON_DESIGNS[ability]('currentColor')}</GlowContext>
    </svg>
  )
}
