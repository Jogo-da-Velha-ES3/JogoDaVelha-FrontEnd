import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState, type KeyboardEvent } from 'react'
import { ABILITY_INFO } from '../../constants/abilities'
import type { AbilityId } from '../../types/game'
import { ABILITY_ICONS } from './abilityIcons'
import { HowToPlayRichText } from './HowToPlayRichText'
import { HOW_TO_PLAY_ABILITY_ORDER, HOW_TO_PLAY_TEXTS as TEXTS } from './howToPlayTexts'

interface HowToPlayDeckProps {
  /** Regras do deck, sempre visíveis */
  points: readonly string[]
  /** O carrossel chegou a uma ponta e a seta pede para sair: a navegação principal muda de página */
  onLeave: (direction: 1 | -1) => void
}

const LAST_ABILITY = HOW_TO_PLAY_ABILITY_ORDER.length - 1
// Mesma troca de página do modal: desliza 24px e some/aparece em 0,15s (sem deslocamento com
// "reduzir movimento")
const SLIDE_OFFSET_PX = 24
const SLIDE_SECONDS = 0.15

/**
 * Tamanho do espaço de cada indicador do carrossel. Hoje cada um é um círculo (igual às bolinhas
 * do modal). PRONTO PARA OS ÍCONES: quando houver ícone em ABILITY_ICONS, o indicador da habilidade
 * passa a mostrar o ícone nesse mesmo espaço, com brilho quando selecionado (ver `IndicatorDot`).
 * Ao entrar os ícones, revise este tamanho e a largura da linha de controles (10 indicadores).
 */
const INDICATOR_SLOT = 'size-5'

/**
 * Página "Habilidades". É uma página só: à esquerda ficam as regras do deck (sempre visíveis) e à
 * direita o carrossel, numa caixa com contorno, que mostra uma habilidade por vez. Abaixo do
 * conteúdo, ‹ ›, e entre eles um indicador por habilidade (as mesmas bolinhas do modal).
 *
 * Convenção de teclado: ← → andam pelas habilidades quando o foco está nos controles do carrossel.
 * Na primeira habilidade ← e na última → passam para a navegação principal (`onLeave`), que muda de
 * página e leva o foco ao botão Anterior/Próximo. Com o foco fora do carrossel, ← → mudam de
 * página. Por toque, os botões ‹ › e os indicadores.
 */
export function HowToPlayDeck({ points, onLeave }: HowToPlayDeckProps) {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  const goTo = (target: number) => {
    const next = Math.min(LAST_ABILITY, Math.max(0, target))
    setDirection(next > index ? 1 : -1)
    setIndex(next)
  }

  // Todo foco possível nesta página está nos controles do carrossel (botões ‹ › e indicadores)
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : null
    if (delta === null) return
    event.preventDefault() // a navegação principal ignora eventos já tratados
    const target = index + delta
    if (target < 0 || target > LAST_ABILITY) onLeave(delta)
    else goTo(target)
  }

  const offset = reduceMotion ? 0 : SLIDE_OFFSET_PX
  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * offset }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: -dir * offset }),
  }
  const current = HOW_TO_PLAY_ABILITY_ORDER[index]

  return (
    <div
      onKeyDown={onKeyDown}
      className="grid min-w-0 flex-1 grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] items-center gap-x-5 short:gap-x-4"
    >
      <ul className="flex flex-col gap-1 text-sm leading-snug font-medium text-text">
        {points.map((point) => (
          <li key={point}>
            <HowToPlayRichText text={point} />
          </li>
        ))}
      </ul>

      <div
        role="group"
        aria-roledescription="carrossel"
        aria-label={TEXTS.deckCarousel}
        className="flex flex-col rounded-xl border-2 border-primary/35 bg-bg-base/60 p-2.5"
      >
        {/* Altura mínima = a de 3 linhas de descrição: a caixa não muda de tamanho entre habilidades.
            O conteúdo fica colado embaixo (justify-end), perto do indicador, qualquer que seja o
            tamanho da descrição; a folga das descrições curtas fica em cima. */}
        <div className="flex min-h-22 flex-col justify-end overflow-x-clip">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0 : SLIDE_SECONDS }}
            >
              <AbilityItem id={current} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="-mt-1 flex items-center justify-center">
          <StepButton
            label={TEXTS.previousSlide}
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            glyph="‹"
          />
          <nav aria-label={TEXTS.deckCarousel} className="flex items-center">
            {HOW_TO_PLAY_ABILITY_ORDER.map((id, position) => (
              <IndicatorDot
                key={id}
                id={id}
                label={TEXTS.abilityDot(
                  ABILITY_INFO[id].name,
                  position + 1,
                  HOW_TO_PLAY_ABILITY_ORDER.length,
                )}
                selected={position === index}
                onClick={() => goTo(position)}
              />
            ))}
          </nav>
          <StepButton
            label={TEXTS.nextSlide}
            disabled={index === LAST_ABILITY}
            onClick={() => goTo(index + 1)}
            glyph="›"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Indicador de uma habilidade no carrossel: as mesmas bolinhas do modal (a selecionada com brilho).
 *
 * ÍCONES: se `ABILITY_ICONS[id]` existir, o círculo dá lugar ao ícone, no mesmo espaço
 * (INDICATOR_SLOT), com brilho quando selecionado e esmaecido quando não. Nada mais precisa mudar.
 */
function IndicatorDot({
  id,
  label,
  selected,
  onClick,
}: {
  id: AbilityId
  label: string
  selected: boolean
  onClick: () => void
}) {
  const icon = ABILITY_ICONS[id]
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={selected ? 'step' : undefined}
      onClick={onClick}
      className={`grid ${INDICATOR_SLOT} place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-primary`}
    >
      {icon ? (
        <span
          className={[
            'block size-full transition [&>*]:size-full',
            selected ? 'drop-shadow-[0_0_6px_var(--color-primary)]' : 'opacity-50',
          ].join(' ')}
        >
          {icon}
        </span>
      ) : (
        <span
          className={[
            'size-2.5 rounded-full transition-colors',
            selected ? 'bg-primary shadow-glow shadow-primary/50' : 'bg-text-muted/40',
          ].join(' ')}
        />
      )}
    </button>
  )
}

/** `aria-disabled` em vez de `disabled`: o botão não perde o foco, e as setas seguem valendo */
function StepButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string
  glyph: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick()
      }}
      className={[
        'grid size-10 place-items-center rounded-lg text-2xl text-text-muted focus-visible:outline-2 focus-visible:outline-primary',
        disabled ? 'opacity-40' : 'hover:bg-bg-raised hover:text-primary',
      ].join(' ')}
    >
      {glyph}
    </button>
  )
}

/** Marcador neutro (o círculo vazio dos tiles de habilidade do esboço) */
function NeutralMarker({ className = 'size-4' }: { className?: string }) {
  return <span className={`block rounded-full border-2 border-line ${className}`} />
}

function AbilityItem({ id }: { id: AbilityId }) {
  const info = ABILITY_INFO[id]
  return (
    <div className="flex min-w-0 items-start gap-3">
      <AbilityIconSlot id={id} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2">
          <span className="font-display text-[22px] leading-tight font-bold tracking-wide text-text uppercase [text-shadow:0_0_12px_color-mix(in_srgb,var(--color-primary)_65%,transparent)] short:text-xl">
            {info.name}
          </span>
          <span className="rounded-full border border-line px-1.5 font-mono text-[10px] tracking-wide text-text-muted uppercase">
            {TEXTS.abilityKinds[info.kind]}
          </span>
        </p>
        <p className="mt-0.5 text-sm leading-snug font-medium text-text">{info.description}</p>
      </div>
    </div>
  )
}

/**
 * Espaço fixo do ícone da habilidade (mesmo tamanho com ou sem ícone). Sem entrada em
 * ABILITY_ICONS, mostra o marcador neutro. Decorativo: o nome já está ao lado.
 */
function AbilityIconSlot({ id }: { id: AbilityId }) {
  const icon = ABILITY_ICONS[id]
  return (
    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center short:size-9">
      {icon ? (
        <span className="block size-full [&>*]:size-full">{icon}</span>
      ) : (
        <NeutralMarker className="size-6" />
      )}
    </span>
  )
}
