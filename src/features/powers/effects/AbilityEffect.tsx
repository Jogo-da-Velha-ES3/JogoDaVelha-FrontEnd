import type { ComponentType } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ABILITY_INFO } from '../../../constants/abilities'
import { CHARACTER_INFO } from '../../../constants/characters'
import { otherSlot } from '../../../lib/match'
import type { ResolvedAbility } from '../../../stores/boardStore'
import type { AbilityId, CharacterId, PlayerSlot } from '../../../types/game'
import { abilityImpactSide } from '../abilityImpactSide'
import { AbsorbedEffect } from './AbsorbedEffect'
import { BlackHoleEffect } from './BlackHoleEffect'
import { BombEffect } from './BombEffect'
import { cellStepPercent, gridCell } from './effectGeometry'
import type { EffectProps } from './effectParts'
import { ForceFieldEffect } from './ForceFieldEffect'
import { FreezeEffect } from './FreezeEffect'
import { HourglassEffect } from './HourglassEffect'
import { NoEffectEffect } from './NoEffectEffect'
import { QuickSwapEffect } from './QuickSwapEffect'
import { ReinforceEffect } from './ReinforceEffect'
import { ShieldEffect } from './ShieldEffect'
import { SilenceEffect } from './SilenceEffect'
import { StaticEffect } from './StaticEffect'
import { TornadoEffect } from './TornadoEffect'

const EFFECTS: Record<AbilityId, ComponentType<EffectProps>> = {
  BOMBA: BombEffect,
  ESCUDO: ShieldEffect,
  AMPULHETA: HourglassEffect,
  TORNADO: TornadoEffect,
  BURACO_NEGRO: BlackHoleEffect,
  CONGELAR: FreezeEffect,
  CAMPO_DE_FORCA: ForceFieldEffect,
  SILENCIO: SilenceEffect,
  TROCA_RAPIDA: QuickSwapEffect,
  REFORCO: ReinforceEffect,
}

export interface AbilityEffectProps {
  result: ResolvedAbility
  /** Personagem de cada lado: dá a cor do efeito e a peça atingida */
  characters: Record<PlayerSlot, CharacterId>
  /** Casas por lado do tabuleiro (4 no jogo) */
  size: number
}

/**
 * Animação da habilidade que o servidor resolveu (FE-47), desenhada dentro do grid do tabuleiro:
 * cada habilidade tem a sua (uma por arquivo nesta pasta), na cor de quem usou. Anulada e sem
 * efeito têm animação própria; com "reduzir movimento", só o ícone aparece. Não lê store: a
 * Arena, a vitrine e a demonstração da Loja passam o resultado. Quem monta decide quanto tempo
 * ela fica (ABILITY_IMPACT_SECONDS na Arena) e troca a `key` a cada resultado novo.
 */
export function AbilityEffect({ result, characters, size }: AbilityEffectProps) {
  const reduceMotion = useReducedMotion()
  const side = abilityImpactSide(result)
  const colorOf = (slot: PlayerSlot) => CHARACTER_INFO[characters[slot]].color
  const owner =
    ABILITY_INFO[result.ability].target === 'OWN_PIECE' ? result.by : otherSlot(result.by)

  const Effect = reduceMotion
    ? StaticEffect
    : result.absorbed
      ? AbsorbedEffect
      : result.noEffect
        ? NoEffectEffect
        : EFFECTS[result.ability]

  return (
    <div
      data-layer="ability-effect"
      data-ability={result.ability}
      data-outcome={result.absorbed ? 'absorbed' : result.noEffect ? 'no-effect' : 'applied'}
      aria-hidden="true"
      className="contents"
      style={{ color: side ? colorOf(side) : 'var(--color-text-muted)' }}
    >
      <Effect
        result={result}
        userColor={colorOf(result.by)}
        target={result.targetCell === null ? null : gridCell(result.targetCell, size)}
        destination={
          result.destinationCell === null ? null : gridCell(result.destinationCell, size)
        }
        piece={characters[owner]}
        step={cellStepPercent(size)}
      />
    </div>
  )
}
