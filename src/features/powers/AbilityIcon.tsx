import { ABILITY_ICONS } from '../hub/abilityIcons'
import type { AbilityId } from '../../types/game'

interface AbilityIconProps {
  ability: AbilityId
  /** Tamanho do espaço do ícone (o mesmo com ou sem ícone) */
  className?: string
}

/**
 * Ícone da habilidade num espaço fixo. Enquanto a habilidade não tem ícone em ABILITY_ICONS,
 * mostra o marcador neutro do Como Jogar. Decorativo: o nome fica sempre ao lado.
 */
export function AbilityIcon({ ability, className = 'size-5' }: AbilityIconProps) {
  const icon = ABILITY_ICONS[ability]
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center ${className}`}>
      {icon ? (
        <span className="block size-full [&>*]:size-full">{icon}</span>
      ) : (
        <span className="block size-3/4 rounded-full border-2 border-line" />
      )}
    </span>
  )
}
