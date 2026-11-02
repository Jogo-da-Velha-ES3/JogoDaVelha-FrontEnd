import { AnimatePresence, motion, type TargetAndTransition, useReducedMotion } from 'framer-motion'
import type { VitaoExpression } from '../../lib/vitao'
import bravo from './assets/vitao-bravo.webp'
import debochado from './assets/vitao-debochado.webp'
import diabo from './assets/vitao-diabo.webp'
import dormindo from './assets/vitao-dormindo.webp'
import muitoBravo from './assets/vitao-muito-bravo.webp'
import normal from './assets/vitao-normal.webp'
import rindo from './assets/vitao-rindo.webp'
import surpreso from './assets/vitao-surpreso.webp'

const IMAGES: Record<VitaoExpression, string> = {
  NORMAL: normal,
  RINDO: rindo,
  DEBOCHADO: debochado,
  BRAVO: bravo,
  MUITO_BRAVO: muitoBravo,
  SURPRESO: surpreso,
  DORMINDO: dormindo,
  DIABO: diabo,
}

/** Parado: respira e balança devagar, sem parar */
const IDLE: TargetAndTransition = {
  y: [0, -5, 0],
  rotate: [-2, 2, -2],
  scale: [1, 1.02, 1],
  transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
}

/** Movimento de cada reação, tocado uma vez quando a fala chega. Normal e Diabo só trocam de cara */
const REACTION: Partial<Record<VitaoExpression, TargetAndTransition>> = {
  // comemora: pulinhos
  RINDO: { y: [0, -10, 0, -5, 0] },
  // leva susto
  SURPRESO: { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] },
  // debocha: inclina a cabeça e volta
  DEBOCHADO: { rotate: [0, -10, -10, 0] },
  BRAVO: { x: [0, -4, 4, -4, 4, 0] },
  MUITO_BRAVO: { x: [0, -6, 6, -6, 6, 0], scale: [1, 1.1, 1] },
  // cochila: a cabeça pende
  DORMINDO: { y: [0, 4, 4, 0], rotate: [0, 8, 8, 0] },
}

export interface VitaoViewProps {
  expression: VitaoExpression
  /** Fala no balão; sem fala, o balão some */
  text?: string | null
  /** Versão "Diabo" da Morte Súbita: balão em vermelho */
  devil?: boolean
  /** Muda a cada fala nova: repete a reação mesmo com a mesma expressão */
  reactionId?: number
}

/**
 * O Vitão desenhado (FE-42): cabeça com brilho neon, que respira parada e reage a cada fala, e o
 * balão em cima, com até 3 linhas (2 no celular deitado). Só desenha: quem decide a expressão e a
 * fala é o motor de reações (FE-44), no VitaoSlot. Fica à esquerda do espaço, com o rabinho do
 * balão em cima da cabeça. A cabeça acompanha a altura da tela (~72px no celular deitado, até
 * 160px) e encolhe se o balão não couber, sem cobrir as faixas, até o mínimo de 48px.
 */
export function VitaoView({ expression, text, devil = false, reactionId }: VitaoViewProps) {
  const reduceMotion = useReducedMotion()
  const reaction = reduceMotion ? undefined : REACTION[expression]

  return (
    <div className="flex size-full min-h-0 flex-col items-start justify-center gap-1.5 [--vitao-head:clamp(4rem,22vh,10rem)]">
      <AnimatePresence>
        {text && (
          <motion.div
            key={reactionId ?? text}
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.85 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="relative max-w-full shrink-0"
          >
            <p
              role="status"
              className={`line-clamp-3 rounded-xl short:line-clamp-2 border bg-bg-raised px-2 py-1 font-body text-xs leading-snug ${devil ? 'border-danger text-danger' : 'border-line'}`}
            >
              {text}
            </p>
            {/* Rabinho do balão, no meio da cabeça */}
            <span
              aria-hidden
              className={`absolute -bottom-1 left-[calc(var(--vitao-head)/2)] size-2 -translate-x-1/2 rotate-45 border-r border-b bg-bg-raised ${devil ? 'border-danger' : 'border-line'}`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-0 w-full items-center">
        <motion.div
          animate={reduceMotion ? undefined : IDLE}
          className="aspect-square h-(--vitao-head) max-h-full min-h-12 max-w-full"
        >
          <motion.img
            // Nova fala, novo elemento: a reação toca de novo do começo
            key={reactionId ?? expression}
            src={IMAGES[expression]}
            alt="Vitão"
            animate={reaction}
            transition={{ duration: 0.6 }}
            className={`size-full object-contain drop-shadow-[0_0_10px_color-mix(in_srgb,currentColor_45%,transparent)] ${expression === 'DIABO' ? 'text-danger' : 'text-primary'}`}
          />
        </motion.div>
      </div>
    </div>
  )
}
