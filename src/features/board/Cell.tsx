import type { CSSProperties } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import type { CellEffect, CellEffectKind, CharacterId } from '../../types/game'
import { Character } from '../characters'

/** Mira de habilidade: `target` = alvo possível, `selected` = alvo já escolhido */
export type CellAim = 'target' | 'selected'

export interface CellProps {
  /** Posição, a partir de 0; usada no nome acessível ("Linha 1, coluna 3") */
  row: number
  col: number
  /** Personagem da peça na casa, ou null se vazia */
  piece: CharacterId | null
  /** Efeitos com contador de turnos, como o servidor manda [RN-ARN-07] */
  effects?: readonly CellEffect[]
  aim?: CellAim
  /** Faz parte da linha vencedora confirmada pelo servidor */
  winning?: boolean
  /** Sem `onSelect`, ou com `disabled`, a casa só mostra o estado */
  onSelect?: () => void
  disabled?: boolean
  /** A casa ocupa a largura de quem a envolve (a célula do grid do tabuleiro) e fica quadrada */
  className?: string
}

const EFFECT_LABEL: Record<CellEffectKind, string> = {
  ESCUDO: 'bloqueada por Escudo',
  CONGELAR: 'congelada',
  REFORCO: 'com Reforço',
}

const BADGE_CLASSES: Record<CellEffectKind, string> = {
  ESCUDO: 'bg-primary text-on-primary',
  CONGELAR: 'bg-ice text-on-primary',
  REFORCO: 'border border-primary bg-bg-deep text-primary',
}

const turns = (n: number) => (n === 1 ? '1 turno' : `${n} turnos`)

function describe({ row, col, piece, effects = [], aim, winning }: CellProps): string {
  return [
    `Linha ${row + 1}, coluna ${col + 1}: ${piece ? CHARACTER_INFO[piece].name : 'vazia'}`,
    ...effects.map((e) => `${EFFECT_LABEL[e.kind]} por ${turns(e.turnsLeft)}`),
    winning && 'linha vencedora',
    aim === 'target' && 'alvo possível',
    aim === 'selected' && 'alvo escolhido',
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Casa do tabuleiro com os estados da ERS [RF-ARN-01]. Só visual: recebe o estado por props.
 * Os efeitos são camadas sobrepostas, então nenhum estado muda o tamanho da casa.
 */
export function Cell(props: CellProps) {
  const { piece, effects = [], aim, winning = false, onSelect, disabled = false } = props
  const has = (kind: CellEffectKind) => effects.some((e) => e.kind === kind)
  const interactive = onSelect !== undefined && !disabled
  const color = piece ? CHARACTER_INFO[piece].color : 'var(--color-primary)'

  const className = [
    'relative grid aspect-square w-full place-items-center rounded-lg border-2 bg-bg-panel',
    winning ? 'border-(--cell-color)' : 'border-line',
    interactive
      ? 'cursor-pointer transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
      : '',
    props.className ?? '',
  ].join(' ')

  const content = (
    <>
      {winning && (
        <span
          data-layer="winning"
          className="absolute inset-0 rounded-md bg-(--cell-color)/20 shadow-[inset_0_0_14px] shadow-(color:--cell-color)/60 motion-safe:animate-glow-pulse"
        />
      )}

      {piece && (
        <Character
          id={piece}
          variant="piece"
          decorative
          className={`size-[78%] ${has('CONGELAR') ? 'brightness-90 saturate-[.3]' : ''}`}
        />
      )}

      {has('ESCUDO') && (
        <svg
          data-layer="shield"
          viewBox="0 0 24 24"
          className="absolute size-[58%] text-primary drop-shadow-[0_0_6px_currentColor]"
        >
          <path
            d="M12 2.5 L19.5 5.5 V11 C19.5 15.8 16.4 19.2 12 21.5 C7.6 19.2 4.5 15.8 4.5 11 V5.5 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {has('REFORCO') && (
        <span
          data-layer="reinforced"
          className="absolute inset-[8%] rounded-full border-2 border-primary/80 shadow-glow shadow-primary/40"
        />
      )}

      {has('CONGELAR') && (
        <span
          data-layer="frozen"
          className="absolute inset-0 rounded-md border border-ice/70 bg-ice/15 shadow-[inset_0_0_12px] shadow-ice/70"
        />
      )}

      {aim && (
        <span
          data-layer="aim"
          className={[
            'absolute inset-0.5 rounded-md border-2 border-primary',
            aim === 'target'
              ? 'border-dashed motion-safe:animate-glow-pulse'
              : 'shadow-glow shadow-primary/60',
          ].join(' ')}
        />
      )}

      {effects.length > 0 && (
        <span
          data-layer="counters"
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex gap-0.5"
        >
          {effects.map((e) => (
            <span
              key={e.kind}
              className={`grid size-4 place-items-center rounded-full font-mono text-[10px] leading-none font-medium ${BADGE_CLASSES[e.kind]}`}
            >
              {e.turnsLeft}
            </span>
          ))}
        </span>
      )}
    </>
  )

  const style = { '--cell-color': color } as CSSProperties
  const label = describe(props)

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        aria-label={label}
        onClick={onSelect}
      >
        {content}
      </button>
    )
  }

  return (
    <div role="img" className={className} style={style} aria-label={label}>
      {content}
    </div>
  )
}
