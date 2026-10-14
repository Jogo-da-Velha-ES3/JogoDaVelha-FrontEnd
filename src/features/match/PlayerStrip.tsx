import type { CSSProperties } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import { MAX_CONSECUTIVE_TIMEOUTS, ROUNDS_TO_WIN_MATCH } from '../../constants/game'
import type { PlayerState } from '../../types/game'
import { Character } from '../characters'

interface PlayerStripProps {
  player: PlayerState | undefined
  isMe: boolean
  /** É a vez deste jogador */
  active: boolean
  roundsWon: number
  timeouts: number
}

/**
 * Faixa básica do jogador na Arena: avatar, apelido, rounds vencidos e estouros x/3, na cor do
 * personagem. A FE-05 enriquece (Campo de Força, Silêncio, desconexão).
 */
export function PlayerStrip({ player, isMe, active, roundsWon, timeouts }: PlayerStripProps) {
  const character = player?.character ?? null
  const color = character ? CHARACTER_INFO[character].color : 'var(--color-line)'
  const nickname = player?.nickname ?? (isMe ? 'Você' : 'Oponente')

  return (
    <section
      aria-label={`${nickname}${isMe ? ' (você)' : ''}: ${roundsWon} ${roundsWon === 1 ? 'round vencido' : 'rounds vencidos'}, ${timeouts} de ${MAX_CONSECUTIVE_TIMEOUTS} estouros`}
      data-active={active || undefined}
      style={{ '--side': color } as CSSProperties}
      className={[
        'flex items-center gap-2 rounded-xl border-2 p-2 transition-colors short:p-1.5',
        active ? 'border-(--side) bg-(--side)/10' : 'border-line',
      ].join(' ')}
    >
      {character ? (
        <Character id={character} variant="avatar" decorative className="size-9 short:size-8" />
      ) : (
        <span className="size-9 shrink-0 rounded-full border-2 border-line short:size-8" />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-display text-sm font-bold">
          {nickname}
          {isMe && <span className="font-body text-xs font-normal text-text-muted"> (você)</span>}
        </p>
        <div aria-hidden="true" className="flex items-center gap-1.5">
          {Array.from({ length: ROUNDS_TO_WIN_MATCH }, (_, i) => (
            <span
              key={i}
              className={`size-2 rounded-full border border-(--side) ${i < roundsWon ? 'bg-(--side)' : ''}`}
            />
          ))}
          <span
            className={`ml-1 font-mono text-[10px] ${timeouts > 0 ? 'text-danger' : 'text-text-muted'}`}
          >
            {timeouts}/{MAX_CONSECUTIVE_TIMEOUTS}
          </span>
        </div>
      </div>
    </section>
  )
}
