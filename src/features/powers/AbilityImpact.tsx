import { motion, useReducedMotion } from 'framer-motion'
import type { BoardState } from '../../stores/boardStore'
import { AbilityIcon } from './AbilityIcon'

type ResolvedAbility = NonNullable<BoardState['lastAbility']>

const IMPACT_DURATION_SECONDS = 1

const COLORS: Record<ResolvedAbility['ability'], string> = {
  BOMBA: 'border-danger text-danger shadow-[0_0_24px_var(--color-danger)]',
  ESCUDO: 'border-primary text-primary shadow-[0_0_24px_var(--color-primary)]',
  AMPULHETA: 'border-coin text-coin shadow-[0_0_24px_var(--color-coin)]',
  TORNADO: 'border-primary text-primary shadow-[0_0_24px_var(--color-primary)]',
  BURACO_NEGRO: 'border-text-muted text-text-muted shadow-[0_0_24px_var(--color-text-muted)]',
  CONGELAR: 'border-ice text-ice shadow-[0_0_24px_var(--color-ice)]',
  CAMPO_DE_FORCA: 'border-primary text-primary shadow-[0_0_24px_var(--color-primary)]',
  SILENCIO: 'border-text-muted text-text-muted shadow-[0_0_24px_var(--color-text-muted)]',
  TROCA_RAPIDA: 'border-primary text-primary shadow-[0_0_24px_var(--color-primary)]',
  REFORCO: 'border-primary text-primary shadow-[0_0_24px_var(--color-primary)]',
}

interface AbilityImpactProps {
  result: ResolvedAbility
  /** Efeito central para habilidades globais, sem casa-alvo */
  global?: boolean
}

/** Feedback visual derivado exclusivamente de ABILITY_RESOLVED do servidor. */
export function AbilityImpact({ result, global = false }: AbilityImpactProps) {
  const reduceMotion = useReducedMotion()
  const absorbed = result.absorbed
  const noEffect = result.noEffect
  const iconAnimation =
    result.ability === 'BURACO_NEGRO'
      ? { scale: [1.15, 0.1, 0.1, 1.1], rotate: [0, 180, 360, 540] }
      : result.ability === 'TORNADO'
        ? { rotate: [0, 180, 360, 540], scale: [0.4, 1, 0.7, 1.1] }
        : result.ability === 'TROCA_RAPIDA'
          ? { x: [-24, 0, 18, 0], scale: [0.5, 1, 0.8, 1.1] }
          : result.ability === 'CONGELAR'
            ? { scale: [0.5, 1.2, 0.9, 1], rotate: [0, -10, 10, 0] }
            : { scale: [0.35, 1.25, 0.9, 1.12], rotate: [-18, 0, 8, 0] }
  const tone = absorbed
    ? 'border-coin text-coin shadow-[0_0_24px_var(--color-coin)]'
    : noEffect
      ? 'border-text-muted text-text-muted'
      : COLORS[result.ability]

  return (
    <motion.span
      key={`${result.ability}-${result.serverTime}`}
      data-layer={global ? 'ability-impact-global' : 'ability-impact'}
      aria-hidden="true"
      initial={reduceMotion ? { opacity: 0.7, scale: 1 } : { opacity: 0, scale: 0.35 }}
      animate={reduceMotion ? { opacity: 0.7 } : { opacity: [0, 1, 0.85, 0], ...iconAnimation }}
      transition={{
        duration: reduceMotion ? 0.12 : IMPACT_DURATION_SECONDS,
        times: [0, 0.25, 0.65, 1],
        ease: 'easeOut',
      }}
      className={`pointer-events-none absolute grid place-items-center rounded-full border-2 bg-bg-deep/80 ${tone} ${global ? 'inset-[18%] z-10 mx-auto my-auto aspect-square max-h-[55%]' : 'inset-[7%]'}`}
    >
      {absorbed || noEffect ? (
        <span className="px-1 text-center font-display text-[clamp(8px,1.7vmin,14px)] font-black uppercase">
          {absorbed ? 'Anulada' : 'Sem efeito'}
        </span>
      ) : (
        <AbilityIcon ability={result.ability} className="size-[55%]" />
      )}
    </motion.span>
  )
}
