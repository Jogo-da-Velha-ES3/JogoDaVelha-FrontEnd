import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { TimerBar } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { DRAW_PICK_SECONDS, STARTER_ABILITIES } from '../../constants/game'
import { useServerTimer } from '../../hooks/useServerTimer'
import { sendCommand } from '../../sockets/gameClient'
import type { AbilityId } from '../../types/game'

export interface DrawPickerProps {
  options: AbilityId[] | null
  deadline: number | null
}

/** Overlay do sorteio: envia somente a intenção e espera a confirmação do servidor. */
export function DrawPicker({ options, deadline }: DrawPickerProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()
  const timerDeadline =
    deadline === null
      ? null
      : { startedAt: deadline - DRAW_PICK_SECONDS * 1000, durationSeconds: DRAW_PICK_SECONDS }
  const timer = useServerTimer(timerDeadline)
  const roundKey = `${deadline ?? 'waiting'}:${options?.join(',') ?? ''}`
  const pending = pendingKey === roundKey
  const expired = timer !== null && timer.remainingMs <= 0

  const pick = (ability: AbilityId) => {
    if (!options?.includes(ability) || pending || expired) return
    setPendingKey(roundKey)
    sendCommand({ type: 'DRAW_PICK', payload: { ability } })
  }

  return (
    <motion.div
      role="region"
      aria-label="Sorteio da terceira habilidade"
      className="absolute inset-0 z-30 grid place-items-center bg-bg-deep/80 p-3 backdrop-blur-sm short:p-2"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.section
        aria-labelledby="draw-picker-title"
        className="flex max-h-full w-full max-w-3xl flex-col gap-3 overflow-y-auto rounded-2xl border-2 border-primary/50 bg-bg-panel p-4 shadow-glow-lg shadow-primary/20 short:gap-2 short:p-3"
        initial={reduceMotion ? false : { y: 18, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <header className="text-center">
          <h2
            id="draw-picker-title"
            className="font-display text-2xl font-black tracking-wide text-primary uppercase short:text-xl"
          >
            Sorteio da 3ª habilidade
          </h2>
          <p className="text-sm text-text-muted short:text-xs">
            Escolha uma carta para completar seu deck.
          </p>
        </header>

        <div className="mx-auto w-full max-w-lg">
          <TimerBar
            deadline={timerDeadline}
            label="Tempo para escolher a habilidade"
            warnAtSeconds={3}
          />
        </div>

        {options ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {options.map((ability, index) => {
              const info = ABILITY_INFO[ability]
              const experiment = !STARTER_ABILITIES.includes(
                ability as (typeof STARTER_ABILITIES)[number],
              )

              return (
                <motion.button
                  key={ability}
                  type="button"
                  disabled={pending || expired}
                  aria-label={`${info.name}${experiment ? ', experimente' : ''}. ${info.description}`}
                  onClick={() => pick(ability)}
                  className="group relative flex min-h-32 min-w-0 flex-col items-start justify-between gap-2 rounded-xl border-2 border-line bg-bg-raised p-3 text-left transition hover:border-primary/70 hover:shadow-glow hover:shadow-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60 short:min-h-28 short:p-2"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: reduceMotion ? 0 : index * 0.08 }}
                >
                  <span className="flex w-full items-start justify-between gap-1">
                    <span className="font-display text-base leading-tight font-extrabold text-primary uppercase sm:text-lg">
                      {info.name}
                    </span>
                    {experiment && (
                      <span className="shrink-0 rounded-full border border-coin/50 bg-coin/10 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wide text-coin uppercase sm:text-[10px]">
                        Experimente
                      </span>
                    )}
                  </span>
                  <span className="text-xs leading-snug text-text-muted short:text-[10px] sm:text-sm">
                    {info.description}
                  </span>
                  <span className="font-display text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    {info.kind}
                  </span>
                </motion.button>
              )
            })}
          </div>
        ) : (
          <p role="status" className="py-5 text-center font-display font-bold text-text-muted">
            Aguardando as cartas do servidor…
          </p>
        )}

        {(pending || expired) && (
          <p
            aria-live="polite"
            role="status"
            className="min-h-5 text-center text-xs text-text-muted"
          >
            {pending
              ? 'Enviando escolha ao servidor…'
              : 'Tempo esgotado. Aguardando a escolha automática do servidor…'}
          </p>
        )}
      </motion.section>
    </motion.div>
  )
}
