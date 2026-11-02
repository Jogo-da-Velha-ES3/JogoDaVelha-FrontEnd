import { useContext } from 'react'
import { GlowContext } from './glowContext'

interface NeonTubeProps {
  d: string
  color: string
  width: number
  className?: string
  opacity?: number
}

/**
 * Traço de "tubo de neon" do Estilo A: o tubo colorido com brilho
 * e, por cima, o filamento branco com 30% da espessura.
 */
export function NeonTube({ d, color, width, className, opacity }: NeonTubeProps) {
  const glowId = useContext(GlowContext)

  return (
    <g className={className} opacity={opacity}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glowId ? `url(#${glowId})` : undefined}
      />
      <path
        d={d}
        fill="none"
        stroke="#fff"
        strokeWidth={Number((width * 0.3).toFixed(2))}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </g>
  )
}

/** Ponto de luz branco com brilho (ex: o feixe do visor do O) */
export function NeonDot({
  cx,
  cy,
  r,
  className,
}: {
  cx: number
  cy: number
  r: number
  className?: string
}) {
  const glowId = useContext(GlowContext)
  return (
    <circle
      className={className}
      cx={cx}
      cy={cy}
      r={r}
      fill="#fff"
      filter={glowId ? `url(#${glowId})` : undefined}
    />
  )
}

/**
 * Brilho do neon. Em coordenadas do desenho (userSpaceOnUse): com a caixa do próprio traço,
 * uma linha reta (visor do O, olhos do Quadrado) teria altura 0 e sumiria.
 *
 * `soft`: brilho com metade da força, para os ícones. No tubo branco, o brilho cheio tem a mesma
 * cor do filamento e o traço parece desfocado.
 */
export function GlowFilter({
  id,
  blur,
  soft = false,
}: {
  id: string
  blur: number
  soft?: boolean
}) {
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x="-20" y="-20" width="200" height="210">
      <feGaussianBlur stdDeviation={blur} result="blur" />
      {soft && (
        <feColorMatrix
          in="blur"
          type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0"
          result="blur"
        />
      )}
      <feMerge>
        <feMergeNode in="blur" />
        {!soft && <feMergeNode in="blur" />}
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}
