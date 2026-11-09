import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps, type Transition } from 'framer-motion'
import type { ResolvedAbility } from '../../../stores/boardStore'
import type { CharacterId } from '../../../types/game'
import { Character } from '../../characters'
import type { GridCell } from './effectGeometry'

/**
 * O que cada efeito recebe. A cor do efeito (de quem usou; anulada, de quem tinha o Campo de
 * Força; sem efeito, neutra) chega como `color` no contêiner: desenhe com `currentColor`.
 */
export interface EffectProps {
  result: ResolvedAbility
  /** Cor de quem usou a habilidade (no anulado, a habilidade que se estilhaça) */
  userColor: string
  /** Casa do alvo e do destino; null nas habilidades sem casa */
  target: GridCell | null
  destination: GridCell | null
  /** Peça atingida: a do oponente ou a própria, conforme a habilidade */
  piece: CharacterId
  /** Passo entre casas vizinhas, em % da casa (para levar a peça até o destino) */
  step: number
}

/** Camada do efeito sobre uma casa do grid do tabuleiro, ou sobre o tabuleiro inteiro */
export function EffectCell({
  at,
  className = '',
  children,
}: {
  at: GridCell | 'board'
  className?: string
  children: ReactNode
}) {
  const area =
    at === 'board'
      ? { gridRow: '1 / -1', gridColumn: '1 / -1' }
      : { gridRow: at.row, gridColumn: at.col }
  return (
    <div style={area} className={`pointer-events-none relative z-10 min-h-0 min-w-0 ${className}`}>
      {children}
    </div>
  )
}

/** Cópia da peça por cima da casa, para explodir, girar ou viajar até o destino */
export function GhostPiece({
  piece,
  ...motionProps
}: { piece: CharacterId } & HTMLMotionProps<'div'>) {
  return (
    <motion.div className="absolute inset-0" {...motionProps}>
      <Character
        id={piece}
        variant="piece"
        decorative
        className="absolute top-[11%] left-[11%] size-[78%]"
      />
    </motion.div>
  )
}

/** Anel que se abre a partir do centro da casa: chegada da peça, onda de choque */
export function Ring({
  from,
  to,
  width = 3,
  transition,
}: {
  from: number
  to: number
  width?: number
  transition: Transition
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 size-full overflow-visible drop-shadow-[0_0_4px_currentColor]"
    >
      <motion.circle
        cx={50}
        cy={50}
        fill="none"
        stroke="currentColor"
        strokeWidth={width}
        initial={{ r: from, opacity: 0 }}
        animate={{ r: [from, to], opacity: [1, 0] }}
        transition={transition}
      />
    </svg>
  )
}
