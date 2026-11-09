import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { Button, TimerBar } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { DECK_SIZE, DRAW_PICK_SECONDS } from '../../constants/game'
import { ABILITY_TEXTS } from '../../constants/texts'
import { useServerTimer } from '../../hooks/useServerTimer'
import { sendCommand } from '../../sockets/gameClient'
import { selectOwnedAbilities, useProfileStore } from '../../stores/profileStore'
import { useRoomStore } from '../../stores/roomStore'
import type { AbilityId, DeckSlot } from '../../types/game'
import { AbilityIcon } from './AbilityIcon'

export interface DrawPickerProps {
  options: AbilityId[] | null
  deadline: number | null
  /** Meu deck confirmado pelo servidor (DECK_UPDATE). Completo, a carta nova entra no lugar de uma */
  deck: readonly DeckSlot[]
  /** Round atual: no round 1, quem volta depois de escolher vê a carta que entrou */
  round: number
}

const T = ABILITY_TEXTS.draw

/**
 * Overlay do sorteio: envia somente a intenção e espera a confirmação do servidor.
 * Com o deck incompleto (round 1), a carta escolhida entra no deck; sem escolha, o servidor escolhe.
 * Com o deck completo (do round 2 em diante), o jogador escolhe a carta nova e depois qual
 * habilidade do deck sai; sem escolha, o deck fica como está (regra do back, FE-50).
 */
export function DrawPicker({ options, deadline, deck, round }: DrawPickerProps) {
  const lastError = useRoomStore((s) => s.lastError)
  const owned = useProfileStore(useShallow(selectOwnedAbilities))
  // A escolha enviada e o último erro conhecido naquele momento: um erro novo destrava as cartas
  const [sent, setSent] = useState<{
    ability: AbilityId
    removed: AbilityId | null
    error: typeof lastError
  } | null>(null)
  // Deck completo: a carta nova já escolhida, esperando o jogador dizer qual sai
  const [incoming, setIncoming] = useState<AbilityId | null>(null)
  // "Manter meu deck" só esconde as cartas: o servidor não recebe nada e, quando o prazo acaba,
  // mantém o deck como está
  const [kept, setKept] = useState(false)
  const reduceMotion = useReducedMotion()
  const timerDeadline =
    deadline === null
      ? null
      : { startedAt: deadline - DRAW_PICK_SECONDS * 1000, durationSeconds: DRAW_PICK_SECONDS }
  const timer = useServerTimer(timerDeadline)
  const expired = timer !== null && timer.remainingMs <= 0

  const inDeck = (ability: AbilityId) => deck.some((slot) => slot.ability === ability)
  const isExperiment = (ability: AbilityId) => !owned.includes(ability)
  const live = sent !== null && sent.error === lastError ? sent : null
  const pending = live !== null && options !== null
  // O servidor confirmou: o DECK_UPDATE trouxe a carta nova e tirou as opções
  const confirmed = options === null && live !== null && inDeck(live.ability) ? live : null
  // Quem volta (snapshot) depois de escolher no round 1 vê a carta que entrou no deck
  const recovered =
    options === null && confirmed === null && round === 1 && deck.length >= DECK_SIZE
      ? (deck.find((slot) => slot.source === 'DRAWN')?.ability ?? null)
      : null
  const swapping =
    options !== null ? deck.length >= DECK_SIZE : confirmed ? confirmed.removed !== null : round > 1
  const choosing = incoming !== null && options?.includes(incoming) ? incoming : null
  const shown = confirmed?.ability ?? recovered

  const submit = (ability: AbilityId, removed: AbilityId | null) => {
    setSent({ ability, removed, error: useRoomStore.getState().lastError })
    sendCommand({
      type: 'DRAW_PICK',
      payload: removed ? { ability, abilityToRemove: removed } : { ability },
    })
  }

  const choose = (ability: AbilityId) => {
    if (!options?.includes(ability) || pending || expired) return
    if (swapping) setIncoming(ability)
    else submit(ability, null)
  }

  const swapOut = (removed: AbilityId) => {
    if (!choosing || !inDeck(removed) || pending || expired) return
    submit(choosing, removed)
  }

  const subtitle = shown
    ? confirmed?.removed
      ? T.entered
      : T.chosen
    : !swapping
      ? T.choose
      : kept && options
        ? T.keptTitle
        : choosing
          ? T.chooseOut
          : T.chooseSwap

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
            {swapping ? T.titleSwap : T.title}
          </h2>
          <p className="text-sm text-text-muted short:text-xs">{subtitle}</p>
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

        {options && swapping && kept ? (
          <div className="flex flex-col items-center gap-2">
            <ul aria-label={T.deckLabel} className="grid w-full max-w-lg grid-cols-3 gap-2">
              {deck.map((slot) => (
                <li
                  key={slot.ability}
                  className="flex min-w-0 flex-col gap-1 rounded-xl border-2 border-line bg-bg-raised p-2.5 short:p-2"
                >
                  <DeckCardContent slot={slot} />
                </li>
              ))}
            </ul>
            <p role="status" className="text-center text-xs text-text-muted">
              {T.kept}
            </p>
            {!expired && (
              <Button size="sm" variant="ghost" onClick={() => setKept(false)}>
                {T.showCards}
              </Button>
            )}
          </div>
        ) : options && choosing ? (
          <div className="flex flex-col items-center gap-2">
            <p className="flex items-center gap-2">
              <span className="font-display text-[10px] font-bold tracking-wider text-text-muted uppercase">
                {T.incomingLabel}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border-2 border-primary bg-primary/10 px-2.5 py-0.5 font-display text-sm font-extrabold text-primary uppercase">
                <AbilityIcon ability={choosing} className="size-4" />
                {ABILITY_INFO[choosing].name}
              </span>
            </p>
            <div className="grid w-full max-w-lg grid-cols-3 gap-2">
              {deck.map((slot) => (
                <button
                  key={slot.ability}
                  type="button"
                  disabled={pending || expired}
                  aria-label={T.removeLabel(
                    ABILITY_INFO[slot.ability].name,
                    slot.source === 'DRAWN' ? T.drawnTag : T.initialTag,
                  )}
                  onClick={() => swapOut(slot.ability)}
                  className="flex min-w-0 flex-col items-start gap-1 rounded-xl border-2 border-line bg-bg-raised p-2.5 text-left transition hover:border-primary/70 hover:shadow-glow hover:shadow-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60 short:p-2"
                >
                  <DeckCardContent slot={slot} />
                </button>
              ))}
            </div>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setIncoming(null)}>
              {T.back}
            </Button>
          </div>
        ) : options ? (
          <>
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
                    onClick={() => choose(ability)}
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
            {swapping && !pending && !expired && (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <p className="text-xs text-text-muted">{T.keepHint}</p>
                <Button size="sm" variant="ghost" onClick={() => setKept(true)}>
                  {T.keep}
                </Button>
              </div>
            )}
          </>
        ) : shown ? (
          <div className="mx-auto flex w-full max-w-56 flex-col gap-2">
            <div className="flex min-h-28 flex-col items-start justify-between gap-2 rounded-xl border-2 border-primary bg-bg-raised p-3 shadow-glow shadow-primary/25 short:p-2">
              <CardContent ability={shown} experiment={isExperiment(shown)} />
            </div>
            {confirmed?.removed && (
              <p className="text-center text-xs text-text-muted">
                {T.swapped(ABILITY_INFO[confirmed.removed].name)}
              </p>
            )}
            <p role="status" className="text-center text-xs text-text-muted">
              {T.waitingOpponent}
            </p>
          </div>
        ) : (
          <p role="status" className="py-5 text-center font-display font-bold text-text-muted">
            {swapping && deck.length >= DECK_SIZE ? T.waitingEnd : T.waitingCards}
          </p>
        )}

        {options && !kept && (pending || expired) && (
          <p
            aria-live="polite"
            role="status"
            className="min-h-5 text-center text-xs text-text-muted"
          >
            {pending ? T.sending : swapping ? T.expiredSwap : T.expired}
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
            {T.experimentTag}
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

/** Carta do deck em versão compacta, sem descrição, para caber no celular deitado */
function DeckCardContent({ slot }: { slot: DeckSlot }) {
  const info = ABILITY_INFO[slot.ability]
  return (
    <>
      <span className="flex w-full min-w-0 items-center gap-2 text-primary">
        <AbilityIcon ability={slot.ability} className="size-5 shrink-0 short:size-4" />
        <span className="truncate font-display text-sm leading-tight font-extrabold uppercase short:text-xs">
          {info.name}
        </span>
      </span>
      <span className="font-display text-[10px] font-bold tracking-wider text-text-muted uppercase">
        {slot.source === 'DRAWN' ? T.drawnTag : T.initialTag} · {info.kind}
      </span>
    </>
  )
}
