import type { CSSProperties } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ABILITY_IMPACT_SECONDS } from '../../constants/game'
import type { ResolvedAbility } from '../../stores/boardStore'
import { AbilityIcon } from './AbilityIcon'

interface AbilityImpactProps {
  result: ResolvedAbility
  /** Cor de quem usou (ou de quem anulou); sem cor, neutra: a habilidade ficou sem efeito */
  color?: string
  /** Efeito no centro do tabuleiro, para as habilidades sem casa (Silêncio, Ampulheta...) */
  global?: boolean
}

// Efeito genérico por enquanto: as animações próprias de cada habilidade vêm em outro card
const MOTION: Partial<Record<ResolvedAbility['ability'], Record<string, number[]>>> = {
  BURACO_NEGRO: { scale: [1.15, 0.1, 0.1, 1.1], rotate: [0, 180, 360, 540] },
  TORNADO: { rotate: [0, 180, 360, 540], scale: [0.4, 1, 0.7, 1.1] },
  TROCA_RAPIDA: { x: [-24, 0, 18, 0], scale: [0.5, 1, 0.8, 1.1] },
  CONGELAR: { scale: [0.5, 1.2, 0.9, 1], rotate: [0, -10, 10, 0] },
}
const DEFAULT_MOTION = { scale: [0.35, 1.25, 0.9, 1.12], rotate: [-18, 0, 8, 0] }

/**
 * Efeito de uma habilidade que o servidor resolveu (ABILITY_RESOLVED), por cima da casa ou do
 * tabuleiro. Anulada mostra o Campo de Força; sem efeito fica tracejada. O aviso em texto é o
 * AbilityNotice.
 */
export function AbilityImpact({ result, color, global = false }: AbilityImpactProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.span
      key={result.receivedAt}
      data-layer={global ? 'ability-impact-global' : 'ability-impact'}
      aria-hidden="true"
      initial={reduceMotion ? { opacity: 0.8 } : { opacity: 0, scale: 0.35 }}
      animate={
        reduceMotion
          ? { opacity: 0.8 }
          : { opacity: [0, 1, 0.85, 0], ...(MOTION[result.ability] ?? DEFAULT_MOTION) }
      }
      transition={{ duration: ABILITY_IMPACT_SECONDS, times: [0, 0.25, 0.65, 1], ease: 'easeOut' }}
      style={{ '--impact': color ?? 'var(--color-text-muted)' } as CSSProperties}
      className={[
        'pointer-events-none absolute grid place-items-center rounded-full border-2 border-(--impact) bg-bg-deep/80 text-(--impact)',
        result.noEffect ? 'border-dashed' : 'shadow-[0_0_24px_var(--impact)]',
        global ? 'inset-[18%] z-10 m-auto aspect-square max-h-[55%]' : 'inset-[7%]',
      ].join(' ')}
    >
      <AbilityIcon
        ability={result.absorbed ? 'CAMPO_DE_FORCA' : result.ability}
        className="size-[55%]"
      />
    </motion.span>
  )
}
