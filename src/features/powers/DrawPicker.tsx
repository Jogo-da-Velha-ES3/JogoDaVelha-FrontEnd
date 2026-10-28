import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { TimerBar } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { DRAW_PICK_SECONDS, STARTER_ABILITIES } from '../../constants/game'
import { useServerTimer } from '../../hooks/useServerTimer'
import { sendCommand } from '../../sockets/gameClient'
import { useRoomStore } from '../../stores/roomStore'
import type { AbilityId } from '../../types/game'
import { AbilityIcon } from './AbilityIcon'

export interface DrawPickerProps {
  options: AbilityId[] | null
  deadline: number | null
  /** A 3ª habilidade que o servidor já confirmou no deck (DECK_UPDATE), se houver */
  chosen: AbilityId | null
}

// Até o inventário chegar (FE-30, `/me`), só as 3 habilidades grátis contam como compradas.
// TODO FE-30: trocar pelas habilidades desbloqueadas do jogador
const isExperiment = (ability: AbilityId) =>
  !STARTER_ABILITIES.includes(ability as (typeof STARTER_ABILITIES)[number])

/** Overlay do sorteio: envia somente a intenção e espera a confirmação do servidor. */
export function DrawPicker({ options, deadline, chosen }: DrawPickerProps) {
  const lastError = useRoomStore((s) => s.lastError)
  // A escolha enviada e o último erro conhecido naquele momento: um erro novo destrava as cartas
  const [picked, setPicked] = useState<{ key: string; error: typeof lastError } | null>(null)
  const reduceMotion = useReducedMotion()
  const timerDeadline =
    deadline === null
      ? null
      : { startedAt: deadline - DRAW_PICK_SECONDS * 1000, durationSeconds: DRAW_PICK_SECONDS }
  const timer = useServerTimer(timerDeadline)
  const roundKey = `${deadline ?? 'waiting'}:${options?.join(',') ?? ''}`
  const pending = picked?.key === roundKey && picked.error === lastError
  const expired = timer !== null && timer.remainingMs <= 0
  // O servidor confirmou a carta e tirou as opções: falta só o oponente escolher
  const confirmed = options === null ? chosen : null

  const pick = (ability: AbilityId) => {
    if (!options?.includes(ability) || pending || expired) return
    setPicked({ key: roundKey, error: useRoomStore.getState().lastError })
    sendCommand({ type: 'DRAW_PICK', payload: { ability } })
  }

  return (
    <motion.div
      role="region"
      aria-label="Sorteio da terceira habilidade"
      className="absolute inset-0 z-[4] grid place-items-center bg-bg-deep/80 p-3 backdrop-blur-sm short:p-2"
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
            {confirmed
              ? 'Esta é a sua 3ª habilidade nesta rodada.'
              : 'Escolha uma carta para completar seu deck.'}
          </p>
        </header>

        {timerDeadline && (
          <div className="mx-auto w-full max-w-lg">
            <TimerBar
              deadline={timerDeadline}
              label="Tempo para escolher a habilidade"
              warnAtSeconds={3}
            />
          </div>
        )}

        {options ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {options.map((ability, index) => {
              const info = ABILITY_INFO[ability]
              const experiment = isExperiment(ability)

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
                  <CardContent ability={ability} experiment={experiment} />
                </motion.button>
              )
            })}
          </div>
        ) : confirmed ? (
          <div className="mx-auto flex w-full max-w-56 flex-col gap-2">
            <div className="flex min-h-28 flex-col items-start justify-between gap-2 rounded-xl border-2 border-primary bg-bg-raised p-3 shadow-glow shadow-primary/25 short:p-2">
              <CardContent ability={confirmed} experiment={isExperiment(confirmed)} />
            </div>
            <p role="status" className="text-center text-xs text-text-muted">
              Aguardando o oponente…
            </p>
          </div>
        ) : (
          <p role="status" className="py-5 text-center font-display font-bold text-text-muted">
            Aguardando as cartas do servidor…
          </p>
        )}

        {options && (pending || expired) && (
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

function CardContent({ ability, experiment }: { ability: AbilityId; experiment: boolean }) {
  const info = ABILITY_INFO[ability]
  return (
    <>
      <span className="flex w-full items-start justify-between gap-1">
        <span className="flex min-w-0 items-center gap-2 text-primary">
          <AbilityIcon ability={ability} className="size-6 short:size-5 sm:size-7" />
          <span className="font-display text-base leading-tight font-extrabold uppercase sm:text-lg">
            {info.name}
          </span>
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
    </>
  )
}
