import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { RESULT_BURST_SECONDS } from '../../constants/game'
import { type CelebrationFlavor, makeParticles, type ParticleTint } from './celebration'

const TINT: Record<ParticleTint, string | null> = {
  side: null, // a cor do vencedor, que vem por parâmetro
  gold: 'var(--color-coin)',
  white: 'var(--color-primary)',
}

interface CelebrationBurstProps {
  flavor: CelebrationFlavor
  /** Cor do vencedor */
  color: string
}

/**
 * Rajada de partículas da vitória (FE-15). Fica dentro do painel do resultado e é cortada nas
 * bordas dele, então nada vaza para a coluna ao lado. Cada partícula anima só transform e
 * opacidade, por CSS, sem trabalho por quadro no JavaScript, e a camada some depois de
 * RESULT_BURST_SECONDS. Quem usa só monta isto quando a festa deve tocar (ao vivo e sem
 * "reduzir movimento").
 */
export function CelebrationBurst({ flavor, color }: CelebrationBurstProps) {
  const [particles] = useState(() => makeParticles(flavor))
  const [active, setActive] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setActive(false), RESULT_BURST_SECONDS * 1000)
    return () => clearTimeout(id)
  }, [])

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      data-region="result-burst"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          data-particle=""
          className="absolute top-[55%] left-1/2 animate-confetti rounded-[1px] will-change-[transform,opacity]"
          style={
            {
              '--dx': `calc(var(--u) * ${p.dx})`,
              '--dy': `calc(var(--u) * ${p.dy})`,
              '--fall': `calc(var(--u) * ${p.fall})`,
              '--rot': `${p.rot}deg`,
              width: p.bar ? p.size * 0.55 : p.size,
              height: p.bar ? p.size * 1.6 : p.size,
              borderRadius: p.bar ? 1 : 9999,
              backgroundColor: TINT[p.tint] ?? color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

interface CelebrationHaloProps {
  /** Cor do vencedor */
  color: string
  /** Ao vivo: pulsa 3 vezes e fica; sem isso, só o brilho parado do estado final */
  pulse: boolean
}

/** Brilho atrás do personagem do vencedor: um degradê radial (barato), com a opacidade pulsando */
export function CelebrationHalo({ color, pulse }: CelebrationHaloProps) {
  return (
    <span
      aria-hidden="true"
      data-region="result-halo"
      className={`pointer-events-none absolute -inset-[20%] rounded-full ${pulse ? 'animate-glow-pulse' : ''}`}
      style={{
        background: `radial-gradient(circle, color-mix(in srgb, ${color} 35%, transparent) 0%, transparent 68%)`,
        animationIterationCount: pulse ? 3 : undefined,
      }}
    />
  )
}
