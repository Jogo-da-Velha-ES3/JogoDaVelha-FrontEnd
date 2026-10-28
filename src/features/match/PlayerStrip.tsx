import type { CSSProperties } from 'react'
import { TimerBar } from '../../components/ui'
import { CHARACTER_INFO } from '../../constants/characters'
import { MAX_CONSECUTIVE_TIMEOUTS, ROUNDS_TO_WIN_MATCH } from '../../constants/game'
import { useTimerStore } from '../../stores/timerStore'
import type { PlayerState } from '../../types/game'
import { Character } from '../characters'
import { AbilityIcon } from '../powers/AbilityIcon'

interface PlayerStripProps {
  player: PlayerState | undefined
  isMe: boolean
  /** É a vez deste jogador */
  active: boolean
  roundsWon: number
  timeouts: number
}

/**
 * Faixa do jogador na Arena (esboço Tela 7, `.pl` + `.tmr`).
 * - Avatar, apelido, pips de rounds e estouros x/3.
 * - Badges de Campo de Força e Silêncio (os ícones das habilidades) na cor do personagem.
 * - Timer do turno abaixo, só na vez deste jogador — a faixa encolhe sem espaço vazio.
 */
export function PlayerStrip({ player, isMe, active, roundsWon, timeouts }: PlayerStripProps) {
  const character = player?.character ?? null
  const color = character ? CHARACTER_INFO[character].color : 'var(--color-line)'
  const nickname = player?.nickname ?? (isMe ? 'Você' : 'Oponente')

  const turn = useTimerStore((s) => s.turn)
  const showTimer = active && turn !== null

  // Badges de efeito: lidos do PlayerState, só visuais (a lógica vive no servidor)
  const forceFieldTurns = player?.forceFieldTurnsLeft ?? 0
  const silenced = player?.silenced ?? false

  return (
    <section
      aria-label={`${nickname}${isMe ? ' (você)' : ''}: ${roundsWon} ${roundsWon === 1 ? 'round vencido' : 'rounds vencidos'}, ${timeouts} de ${MAX_CONSECUTIVE_TIMEOUTS} estouros${forceFieldTurns > 0 ? ', Campo de Força ativo' : ''}${silenced ? ', silenciado' : ''}`}
      data-active={active || undefined}
      style={{ '--side': color } as CSSProperties}
      className={[
        'flex flex-col rounded-xl border-2 p-2 transition-[border-color,background-color] short:p-1.5',
        showTimer ? 'gap-1.5' : 'gap-0',
        active ? 'border-(--side) bg-(--side)/10' : 'border-line',
      ].join(' ')}
    >
      {/* ── Linha principal: avatar + info + badges ── */}
      <div className="flex items-center gap-2">
        {character ? (
          <Character id={character} variant="avatar" decorative className="size-9 short:size-8" />
        ) : (
          <span className="size-9 shrink-0 rounded-full border-2 border-line short:size-8" />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Apelido + badges CF / Silêncio */}
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate font-display text-sm font-bold leading-tight">
              {nickname}
              {isMe && (
                <span className="font-body text-xs font-normal text-text-muted"> (você)</span>
              )}
            </p>

            {/* Campo de Força: ícone na cor do personagem + contador de turnos restantes */}
            {forceFieldTurns > 0 && (
              <span
                aria-hidden="true"
                title={`Campo de Força ativo (${forceFieldTurns} turno${forceFieldTurns > 1 ? 's' : ''})`}
                className="flex shrink-0 items-center gap-0.5 font-mono text-[10px] font-semibold leading-none"
                style={{ color }}
              >
                <AbilityIcon ability="CAMPO_DE_FORCA" className="size-3.5" />
                {forceFieldTurns}
              </span>
            )}

            {/* Silêncio: ícone na cor do personagem silenciado */}
            {silenced && (
              <span
                aria-hidden="true"
                title="Silenciado neste turno"
                className="shrink-0"
                style={{ color }}
              >
                <AbilityIcon ability="SILENCIO" className="size-3.5" />
              </span>
            )}
          </div>

          {/* Pips de rounds + estouros x/3 */}
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
      </div>

      {/* ── Timer: só na vez deste jogador; faixa encolhe quando some ── */}
      {showTimer && (
        <TimerBar
          deadline={turn}
          color={color}
          warnAtSeconds={isMe ? 3 : 0}
          label={isMe ? 'Seu tempo' : 'Tempo do turno'}
        />
      )}
    </section>
  )
}
