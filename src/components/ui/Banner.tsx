import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

export type BannerTone = 'neutral' | 'danger' | 'coin'

export interface BannerProps {
  show: boolean
  title: ReactNode
  subtitle?: ReactNode
  tone?: BannerTone
  /** Cor do lado do jogador (cor do personagem); tem prioridade sobre `tone` */
  color?: string
  /** Cintilação de letreiro neon no título */
  flicker?: boolean
  className?: string
}

const TONE_COLORS: Record<BannerTone, string> = {
  neutral: 'var(--color-primary)',
  danger: 'var(--color-danger)',
  coin: 'var(--color-coin)',
}

/**
 * Faixa de anúncio gritado ("SUA VEZ", "MATCH POINT", "MORTE SÚBITA"...).
 * Quem usa decide a posição (ex: `absolute inset-x-0 top-1/2`) e por quanto tempo mostra.
 */
export function Banner({
  show,
  title,
  subtitle,
  tone = 'neutral',
  color,
  flicker = false,
  className = '',
}: BannerProps) {
  const style = { '--banner-color': color ?? TONE_COLORS[tone] } as CSSProperties

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          style={style}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 0.6, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={[
            'pointer-events-none border-y-2 border-(--banner-color) bg-bg-deep/85 py-2 text-center backdrop-blur-sm',
            'shadow-glow-lg shadow-(color:--banner-color)/35',
            className,
          ].join(' ')}
        >
          <motion.p
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 520, damping: 22 }}
            className={[
              'font-display text-5xl leading-none font-extrabold tracking-wider text-(--banner-color) uppercase short:text-4xl',
              '[text-shadow:0_0_14px_var(--banner-color)]',
              flicker ? 'motion-safe:animate-neon-flicker' : '',
            ].join(' ')}
          >
            {title}
          </motion.p>
          {subtitle && (
            <p className="mt-1 font-display text-lg font-semibold tracking-wide text-text uppercase short:text-base">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
