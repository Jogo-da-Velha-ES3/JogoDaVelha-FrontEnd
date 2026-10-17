import { useId } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import type { CharacterId } from '../../types/game'
import './characters.css'
import { CHARACTER_DESIGNS } from './designs'
import { GlowContext } from './glowContext'
import { GlowFilter } from './NeonTube'

/**
 * full   = versão grande (Preparação, Hub, VS, Resultado), com enfeites e sombra
 * avatar = rosto num círculo com a borda na cor do personagem (topo do Hub, faixas da Arena)
 * piece  = peça do tabuleiro, legível em ~40px
 */
export type CharacterVariant = 'full' | 'avatar' | 'piece'

export interface CharacterProps {
  id: CharacterId
  variant?: CharacterVariant
  /** Padrão: só a versão grande anima; a peça fica parada para não pesar com 16 casas */
  animated?: boolean
  /** Esconde dos leitores de tela quando o nome já aparece ao lado */
  decorative?: boolean
  /** Tamanho e posição ficam com quem usa, ex: `size-10` */
  className?: string
}

const FULL_VIEWBOX = '0 0 160 170'

/** Personagem no Estilo A (letreiro neon), na cor oficial do CHARACTER_INFO. */
export function Character({
  id,
  variant = 'full',
  animated = variant === 'full',
  decorative = false,
  className = '',
}: CharacterProps) {
  // O id do useId tem caracteres que quebram o `url(#...)` do filtro
  const glowId = `glow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const { name, color } = CHARACTER_INFO[id]
  const design = CHARACTER_DESIGNS[id]
  const full = variant === 'full'
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': name } as const)

  const svg = (
    <svg
      viewBox={full ? FULL_VIEWBOX : design.pieceViewBox}
      data-character={id}
      className={[
        'overflow-visible',
        animated ? 'chr-animated' : '',
        // Avatar: posição absoluta dentro do círculo. Com % de altura num item de grade, o Safari
        // às vezes não resolve o tamanho e o desenho sai do centro (encosta na borda em alguns zooms)
        variant === 'avatar' ? 'absolute top-[11%] left-[11%] size-[78%]' : className,
      ].join(' ')}
      {...(variant === 'avatar' ? { 'aria-hidden': true } : a11y)}
    >
      <defs>
        <GlowFilter id={glowId} blur={full ? 2.6 : 1.8} />
      </defs>
      <GlowContext value={glowId}>
        {full && (
          <ellipse
            cx="80"
            cy="152"
            rx={design.shadowRx}
            ry="5"
            fill={color}
            opacity="0.25"
            filter={`url(#${glowId})`}
          />
        )}
        <g className={full ? 'chr-neon' : undefined}>
          <g className={full ? `chr-${design.motion}` : undefined}>{design.body(color)}</g>
          {full && design.extras?.(color)}
        </g>
      </GlowContext>
    </svg>
  )

  if (variant !== 'avatar') return svg

  return (
    <span
      {...a11y}
      className={`relative inline-block aspect-square shrink-0 rounded-full border-2 bg-bg-panel ${className}`}
      style={{ borderColor: color }}
    >
      {svg}
    </span>
  )
}
