import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { ABILITY_INFO } from '../../constants/abilities'
import type { AbilityId } from '../../types/game'
import { ABILITY_ICONS } from './abilityIcons'
import {
  HOW_TO_PLAY_ABILITY_SLIDES,
  HOW_TO_PLAY_DECK_SLOTS,
  HOW_TO_PLAY_TEXTS as TEXTS,
} from './howToPlayTexts'

interface HowToPlayDeckProps {
  /** Eyebrow e título da página, iguais aos das outras páginas */
  heading: ReactNode
  /** Regras do deck, mostradas na primeira subpágina */
  points: readonly string[]
}

// Subpágina 0 = regras do deck; 1..N = habilidades, em pares
const LAST_SUBPAGE = HOW_TO_PLAY_ABILITY_SLIDES.length
const TOTAL_SUBPAGES = LAST_SUBPAGE + 1

/**
 * Página "Deck e habilidades" com um carrossel de subpáginas.
 *
 * Convenção de teclado: ← → andam pelas subpáginas quando o foco está dentro do carrossel (nos
 * botões ‹ ›). Na primeira subpágina ← e na última → não são tratadas aqui e seguem para a
 * navegação principal, que muda de página. Com o foco fora do carrossel, ← → mudam de página.
 * Por toque, os botões ‹ ›. Esc e as bolinhas continuam valendo.
 */
export function HowToPlayDeck({ heading, points }: HowToPlayDeckProps) {
  const [index, setIndex] = useState(0)

  const step = (delta: 1 | -1) =>
    setIndex((current) => Math.min(LAST_SUBPAGE, Math.max(0, current + delta)))

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === 'ArrowRight' && index < LAST_SUBPAGE) {
      event.preventDefault() // a navegação principal ignora eventos já tratados
      step(1)
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      step(-1)
    }
  }

  return (
    <div
      role="group"
      aria-roledescription="carrossel"
      aria-label={TEXTS.deckCarousel}
      onKeyDown={onKeyDown}
      className="min-w-0 flex-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div>{heading}</div>
        <div className="flex items-center gap-1 pt-1">
          <StepButton
            label={TEXTS.previousSlide}
            disabled={index === 0}
            onClick={() => step(-1)}
            glyph="‹"
          />
          <span className="font-mono text-xs text-text-muted">
            {TEXTS.slideOf(index + 1, TOTAL_SUBPAGES)}
          </span>
          <StepButton
            label={TEXTS.nextSlide}
            disabled={index === LAST_SUBPAGE}
            onClick={() => step(1)}
            glyph="›"
          />
        </div>
      </div>

      {index === 0 ? (
        <DeckRules points={points} />
      ) : (
        <AbilityPair abilities={HOW_TO_PLAY_ABILITY_SLIDES[index - 1]} />
      )}
    </div>
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
        'grid size-8 place-items-center rounded-lg text-lg text-text-muted focus-visible:outline-2 focus-visible:outline-primary',
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

/**
 * Deck de exemplo: as cartas da lista "Seu deck" do sorteio do esboço (`.slots`), com o marcador
 * neutro no lugar do nome da habilidade. A sorteada ganha o destaque (`.swap`).
 */
function DeckRules({ points }: { points: readonly string[] }) {
  return (
    <div className="mt-2 flex items-center gap-4 short:gap-3">
      <ul aria-hidden="true" className="flex w-40 shrink-0 flex-col gap-1.5">
        {HOW_TO_PLAY_DECK_SLOTS.map((source, slot) => (
          <li
            key={slot}
            className={[
              'flex items-center gap-2 rounded-lg border-[1.5px] bg-bg-panel px-2 py-1.5 text-sm',
              source === 'drawn' ? 'border-primary' : 'border-line',
            ].join(' ')}
          >
            <NeutralMarker />
            {source === 'drawn' ? TEXTS.deckSlotDrawn : TEXTS.deckSlotInitial}
          </li>
        ))}
      </ul>
      <ul className="flex min-w-0 flex-1 flex-col gap-1 text-sm leading-snug">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  )
}

function AbilityPair({ abilities }: { abilities: readonly AbilityId[] }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-6 short:gap-x-4">
      {abilities.map((id) => {
        const info = ABILITY_INFO[id]
        return (
          <li key={id} className="flex min-w-0 items-start gap-3">
            <AbilityIconSlot id={id} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2">
                <span className="font-display text-base font-bold tracking-wide text-text uppercase">
                  {info.name}
                </span>
                <span className="rounded-full border border-line px-1.5 font-mono text-[10px] tracking-wide uppercase">
                  {TEXTS.abilityKinds[info.kind]}
                </span>
              </p>
              <p className="mt-0.5 text-sm leading-snug">{info.description}</p>
            </div>
          </li>
        )
      })}
    </ul>
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
