import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { ABILITY_INFO } from '../../constants/abilities'
import type { AbilityId } from '../../types/game'
import { ABILITY_ICONS } from './abilityIcons'
import {
  HOW_TO_PLAY_ABILITY_ORDER,
  HOW_TO_PLAY_DECK_SLOTS,
  HOW_TO_PLAY_TEXTS as TEXTS,
} from './howToPlayTexts'

interface HowToPlayDeckProps {
  /** Eyebrow e título da página, iguais aos das outras páginas */
  heading: ReactNode
  /** Regras do deck, sempre visíveis */
  points: readonly string[]
  /** O carrossel chegou a uma ponta e a seta pede para sair: a navegação principal muda de página */
  onLeave: (direction: 1 | -1) => void
}

const LAST_ABILITY = HOW_TO_PLAY_ABILITY_ORDER.length - 1

/**
 * Página "Deck e habilidades". É uma página só: à esquerda ficam o deck de exemplo e as regras
 * (sempre visíveis) e à direita o carrossel, que mostra uma habilidade por vez.
 *
 * Convenção de teclado: ← → andam pelas habilidades quando o foco está nos botões ‹ ›. Na primeira
 * habilidade ← e na última → passam para a navegação principal (`onLeave`), que muda de página e
 * leva o foco ao botão Anterior/Próximo. Com o foco fora do carrossel, ← → mudam de página.
 * Por toque, os botões ‹ ›.
 */
export function HowToPlayDeck({ heading, points, onLeave }: HowToPlayDeckProps) {
  const [index, setIndex] = useState(0)

  const step = (delta: 1 | -1) =>
    setIndex((current) => Math.min(LAST_ABILITY, Math.max(0, current + delta)))

  // O único foco possível nesta página são os botões ‹ ›, então qualquer tecla vem do carrossel
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : null
    if (delta === null) return
    event.preventDefault() // a navegação principal ignora eventos já tratados
    const target = index + delta
    if (target < 0 || target > LAST_ABILITY) onLeave(delta)
    else step(delta)
  }

  return (
    <div onKeyDown={onKeyDown} className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div>{heading}</div>
        <div role="group" aria-label={TEXTS.deckCarousel} className="flex items-center">
          <StepButton
            label={TEXTS.previousSlide}
            disabled={index === 0}
            onClick={() => step(-1)}
            glyph="‹"
          />
          <span className="min-w-10 text-center font-mono text-xs text-text-muted">
            {TEXTS.slideOf(index + 1, HOW_TO_PLAY_ABILITY_ORDER.length)}
          </span>
          <StepButton
            label={TEXTS.nextSlide}
            disabled={index === LAST_ABILITY}
            onClick={() => step(1)}
            glyph="›"
          />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-x-5 short:gap-x-4">
        <DeckRules points={points} />
        <AbilityItem id={HOW_TO_PLAY_ABILITY_ORDER[index]} />
      </div>
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
        'grid size-11 place-items-center rounded-lg text-2xl text-text-muted focus-visible:outline-2 focus-visible:outline-primary',
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
 * Deck de exemplo: as cartas da lista "Seu deck" do sorteio do esboço (`.slots`), agora em fila,
 * com o marcador neutro no lugar do nome da habilidade. A sorteada ganha o destaque (`.swap`).
 */
function DeckRules({ points }: { points: readonly string[] }) {
  return (
    <div className="min-w-0">
      <ul aria-hidden="true" className="flex gap-1.5">
        {HOW_TO_PLAY_DECK_SLOTS.map((source, slot) => (
          <li
            key={slot}
            className={[
              'flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border-[1.5px] bg-bg-panel px-2 py-1 text-xs',
              source === 'drawn' ? 'border-primary' : 'border-line',
            ].join(' ')}
          >
            <NeutralMarker className="size-3.5 shrink-0" />
            <span className="truncate">
              {source === 'drawn' ? TEXTS.deckSlotDrawn : TEXTS.deckSlotInitial}
            </span>
          </li>
        ))}
      </ul>
      <ul className="mt-2 flex flex-col gap-1 text-sm leading-snug">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  )
}

function AbilityItem({ id }: { id: AbilityId }) {
  const info = ABILITY_INFO[id]
  return (
    <div className="flex min-w-0 items-start gap-3">
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
