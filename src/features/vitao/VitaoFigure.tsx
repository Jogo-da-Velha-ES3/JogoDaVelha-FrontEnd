import { useId } from 'react'
import {
  DEVIL_TAIL,
  OUTLINE_WIDTH,
  VITAO_COLOR,
  VITAO_DEVIL_COLOR,
  VITAO_DEVIL_PALETTE,
  VITAO_EXPRESSIONS,
  VITAO_HEAD,
  VITAO_HEAD_TILT,
  VITAO_PALETTE,
  VITAO_PART_ORDER,
  VITAO_PARTS,
  VITAO_VIEWBOX,
  type PaletteKey,
  type Shape,
  type VitaoExpression,
} from './figure'

export interface VitaoFigureProps {
  expression?: VitaoExpression
  /** Esconde dos leitores de tela quando o Vitão é só enfeite */
  decorative?: boolean
  /** Tamanho e posição ficam com quem usa, ex: `h-24` */
  className?: string
}

/**
 * Bonequinho do Vitão (FE-41): corpo de cartoon desenhado no código, no estilo da cabeça em
 * caricatura, com um contorno neon em volta da silhueta. Parado: a animação
 * (andar, reações, balão) é da FE-42, que gira cada parte (`data-part`) em volta do ponto de
 * `VITAO_PARTS`.
 */
export function VitaoFigure({
  expression = 'normal',
  decorative = false,
  className = '',
}: VitaoFigureProps) {
  // O id do useId tem caracteres que quebram o `url(#...)` do filtro
  const outlineId = `vitao-contorno-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const devil = expression === 'diabo'
  const neon = devil ? VITAO_DEVIL_COLOR : VITAO_COLOR
  const palette = devil ? VITAO_DEVIL_PALETTE : VITAO_PALETTE
  const { image, label } = VITAO_EXPRESSIONS[expression]
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': `Vitão ${label}` } as const)

  return (
    <svg
      viewBox={VITAO_VIEWBOX}
      data-vitao={expression}
      className={`overflow-visible ${className}`}
      {...a11y}
    >
      <defs>
        {/* Contorno neon: a silhueta inteira engrossada, pintada na cor e com brilho */}
        <filter id={outlineId} x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.2" result="grossa" />
          <feFlood floodColor={neon} result="cor" />
          <feComposite in="cor" in2="grossa" operator="in" result="contorno" />
          <feGaussianBlur in="contorno" stdDeviation="1.8" result="brilho" />
          <feMerge>
            <feMergeNode in="brilho" />
            <feMergeNode in="contorno" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${outlineId})`}>
        {VITAO_PART_ORDER.map((part) => {
          const { pivot, shapes } = VITAO_PARTS[part]
          return (
            <g
              key={part}
              data-part={part}
              style={{ transformBox: 'view-box', transformOrigin: `${pivot[0]}px ${pivot[1]}px` }}
            >
              {part === 'tronco' && devil && <Shapes shapes={DEVIL_TAIL} palette={palette} />}
              <Shapes shapes={shapes} palette={palette} />
            </g>
          )
        })}
        {/* Por último: a cabeça cobre o pescoço */}
        <image
          data-part="cabeca"
          href={image}
          x={VITAO_HEAD.x}
          y={VITAO_HEAD.y}
          width={VITAO_HEAD.size}
          height={VITAO_HEAD.size}
          transform={`rotate(${VITAO_HEAD_TILT.angle} ${VITAO_HEAD_TILT.pivot.join(' ')})`}
        />
      </g>
    </svg>
  )
}

function Shapes({ shapes, palette }: { shapes: Shape[]; palette: Record<PaletteKey, string> }) {
  return shapes.map(({ d, fill, line, stroke }) => (
    <path
      key={`${d}-${stroke?.color ?? ''}`}
      d={d}
      fill={fill ? palette[fill] : 'none'}
      stroke={stroke ? palette[stroke.color] : line ? palette.outline : undefined}
      strokeWidth={stroke ? stroke.width : line ? OUTLINE_WIDTH : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ))
}
