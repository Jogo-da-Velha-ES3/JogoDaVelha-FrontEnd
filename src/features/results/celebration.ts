// Comemoração do Resultado (FE-15): que tipo de festa cada resultado ganha e como são as partículas.
// Tudo puro e determinístico (sem Math.random): a mesma rajada sempre, fácil de testar.
import { RESULT_BURST_PARTICLES } from '../../constants/game'
import type { ResultKind } from '../../lib/result'

/** impecável (2×0), vitória comum e vitória por W.O. (versão curta); null = sem festa */
export type CelebrationFlavor = 'flawless' | 'win' | 'short'

export function celebrationFlavor(kind: ResultKind): CelebrationFlavor | null {
  switch (kind) {
    case 'WIN_FLAWLESS':
      return 'flawless'
    case 'WIN':
      return 'win'
    case 'WO_WIN':
      return 'short'
    default:
      // Derrota, empate absoluto e derrota por W.O.: apresentação sóbria, sem partículas
      return null
  }
}

/** A cor da partícula: a do vencedor, o dourado dos Coins ou o branco dos botões */
export type ParticleTint = 'side' | 'gold' | 'white'

export interface Particle {
  id: number
  /** Distâncias em frações de --u (o menor entre a altura e a metade da largura do Resultado) */
  dx: number
  dy: number
  fall: number
  /** Graus */
  rot: number
  /** px */
  size: number
  /** s */
  delay: number
  duration: number
  tint: ParticleTint
  /** Tira (confete) em vez de bolinha */
  bar: boolean
}

/** Gerador pseudoaleatório com semente (mulberry32) */
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED: Record<CelebrationFlavor, number> = { flawless: 11, win: 7, short: 3 }
/** Quão longe vai: a impecável explode mais; a versão curta, menos */
const REACH: Record<CelebrationFlavor, number> = { flawless: 1, win: 0.85, short: 0.7 }
/** A versão curta é mais rápida */
const SPEED: Record<CelebrationFlavor, number> = { flawless: 1, win: 1, short: 0.65 }
const TINTS: ParticleTint[] = ['side', 'gold', 'side', 'gold', 'white']

/**
 * Rajada que sai do centro do painel em leque para cima e cai. Atraso + duração ficam abaixo de
 * RESULT_BURST_SECONDS, então a última partícula some antes de a camada ser desmontada.
 */
export function makeParticles(flavor: CelebrationFlavor): Particle[] {
  const random = seeded(SEED[flavor])
  const between = (min: number, max: number) => min + random() * (max - min)
  const reach = REACH[flavor]
  const speed = SPEED[flavor]

  return Array.from({ length: RESULT_BURST_PARTICLES[flavor] }, (_, id) => {
    const angle = between((-170 * Math.PI) / 180, (-10 * Math.PI) / 180) // para cima
    const radius = between(0.18, 0.42) * reach
    return {
      id,
      dx: +(Math.cos(angle) * radius).toFixed(3),
      dy: +(Math.sin(angle) * radius).toFixed(3),
      fall: +between(0.1, 0.25).toFixed(3),
      rot: Math.round(between(180, 540) * (random() < 0.5 ? -1 : 1)),
      size: Math.round(between(5, 9)),
      delay: +(between(0, 0.35) * speed).toFixed(2),
      duration: +(between(1.6, 2.4) * speed).toFixed(2),
      tint: TINTS[Math.floor(random() * TINTS.length)],
      bar: random() < 0.4,
    }
  })
}
