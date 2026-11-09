import type { CSSProperties } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import {
  BOARD_CELLS,
  BOARD_SIZE,
  MAX_CONSECUTIVE_TIMEOUTS,
  ROUNDS_TO_WIN_MATCH,
  SUDDEN_DEATH_TURN_DURATION_SECONDS,
  TURN_DURATION_SECONDS,
  WIN_LENGTH,
} from '../../constants/game'
import type { Cell, CharacterId, PlayerSlot } from '../../types/game'
import { Board } from '../board'
import { Character } from '../characters'
import { HOW_TO_PLAY_TEXTS as TEXTS, type HowToPlayVisual } from './howToPlayTexts'

// Tudo aqui é uma REPRESENTAÇÃO parada, só para explicar as regras: não lê stores, não tem
// contagem e não acompanha a partida real. As faixas e a barra copiam o desenho da Arena
// (PlayerStrip e TimerBar), mas com valores fixos.

// Tabuleiro de exemplo, igual ao do esboço: uma linha de X completa e algumas peças de O
const O_CELLS = [5, 7, 10]
const DEMO_CELLS: readonly Cell[] = Array.from({ length: BOARD_CELLS }, (_, index) => {
  const owner: PlayerSlot | null = index < BOARD_SIZE ? 'P1' : O_CELLS.includes(index) ? 'P2' : null
  return { index, owner, effects: [] }
})
const DEMO_LINE = Array.from({ length: WIN_LENGTH }, (_, index) => index)

// A barra do jogador parada na metade do turno (5s de 10s), como aparece na partida
const DEMO_TIMER_SECONDS = TURN_DURATION_SECONDS / 2

/** Visuais da base usados de forma estática: sem stores, sem lógica de jogo e sem timer vivo */
export function SideVisual({ kind }: { kind: Exclude<HowToPlayVisual, 'coins' | 'deck'> }) {
  if (kind === 'board') {
    return (
      <div aria-hidden="true" className="size-50 shrink-0 short:size-40">
        <Board cells={DEMO_CELLS} characters={{ P1: 'X', P2: 'O' }} winningLine={DEMO_LINE} />
      </div>
    )
  }

  if (kind === 'turn') {
    return (
      <div aria-hidden="true" className="flex w-56 shrink-0 flex-col gap-2 short:w-48">
        <StaticStrip character="O" name={TEXTS.demoOpponent} />
        <StaticStrip
          character="X"
          name={TEXTS.demoSelf}
          timeouts={MAX_CONSECUTIVE_TIMEOUTS - 1}
          timerSeconds={DEMO_TIMER_SECONDS}
        />
      </div>
    )
  }

  return <SuddenDeathVisual />
}

/**
 * Faixa do jogador (desenho do PlayerStrip). Com `timerSeconds`, é a faixa de quem está na vez:
 * borda e fundo na cor do personagem e a barra de tempo parada nesse valor.
 */
function StaticStrip({
  character,
  name,
  timeouts = 0,
  timerSeconds,
}: {
  character: CharacterId
  name: string
  timeouts?: number
  timerSeconds?: number
}) {
  const color = CHARACTER_INFO[character].color
  const active = timerSeconds !== undefined

  return (
    <section
      style={{ '--side': color } as CSSProperties}
      className={[
        'flex flex-col rounded-xl border-2 p-2 short:p-1.5',
        active ? 'gap-1.5 border-(--side) bg-(--side)/10' : 'gap-0 border-line',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Character id={character} variant="avatar" decorative className="size-9 short:size-8" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate font-display text-sm leading-tight font-bold">{name}</p>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: ROUNDS_TO_WIN_MATCH }, (_, i) => (
              <span key={i} className="size-2 rounded-full border border-(--side)" />
            ))}
            <span
              className={`ml-1 font-mono text-[10px] ${timeouts > 0 ? 'text-danger' : 'text-text-muted'}`}
            >
              {timeouts}/{MAX_CONSECUTIVE_TIMEOUTS}
            </span>
          </div>
        </div>
      </div>
      {active && <StaticTimerBar seconds={timerSeconds} color={color} />}
    </section>
  )
}

/** Barra de tempo (desenho do TimerBar) parada em `seconds`, sem nenhuma contagem */
function StaticTimerBar({ seconds, color }: { seconds: number; color: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-raised">
        <div
          className="size-full origin-left rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
            transform: `scaleX(${seconds / TURN_DURATION_SECONDS})`,
          }}
        />
      </div>
      <span
        className="w-[2ch] text-right font-mono text-sm font-medium tabular-nums"
        style={{ color }}
      >
        {seconds}
      </span>
    </div>
  )
}

/**
 * Rótulo do round e timer gigante da Morte Súbita, como na Arena (canto superior esquerdo e topo
 * da coluna direita), com o timer parado no tempo do turno da Morte Súbita.
 */
function SuddenDeathVisual() {
  return (
    <div
      aria-hidden="true"
      className="flex w-56 shrink-0 flex-col items-center gap-2 text-center short:w-48"
    >
      <p className="font-display text-sm font-bold tracking-wide text-danger uppercase">
        {TEXTS.suddenDeathRound}
      </p>
      <p
        className="font-display text-[62px] leading-[0.85] font-bold text-danger tabular-nums short:text-[42px]"
        style={{
          // Brilho vermelho e as cores dos dois personagens deslocadas, igual à Arena
          textShadow: `0 0 18px var(--color-danger), 3px 0 color-mix(in srgb, ${CHARACTER_INFO.O.color} 50%, transparent), -3px 0 color-mix(in srgb, ${CHARACTER_INFO.X.color} 55%, transparent)`,
        }}
      >
        {SUDDEN_DEATH_TURN_DURATION_SECONDS}
      </p>
    </div>
  )
}
