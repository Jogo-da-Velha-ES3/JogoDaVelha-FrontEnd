import type { CSSProperties } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import { MAX_CONSECUTIVE_TIMEOUTS } from '../../constants/game'
import { otherSlot } from '../../lib/match'
import { useTimerStore } from '../../stores/timerStore'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { TimerBar } from '../../components/ui'
import { Character } from '../characters'

/**
 * Banner de oponente desconectado (esboço estado "dc": .scrim + .ov-card centrado).
 * Aparece quando players[opp].connected === false e some quando ele volta.
 *
 * Sem contagem regressiva — os turnos do oponente continuam correndo normalmente:
 * 3 estouros seguidos resultam em W.O., como no tempo esgotado.
 *
 * Cor: do personagem do oponente. Sem vermelho — para quem ficou isso não é perigo.
 */
export function OpponentDisconnectedToast() {
  const mySlot = useRoomStore((s) => s.mySlot) ?? 'P1'
  const players = useRoomStore((s) => s.players)
  const oppSlot = otherSlot(mySlot)
  const opp = players.find((p) => p.slot === oppSlot)
  const turn = useTimerStore((s) => s.turn)
  const consecutiveTimeouts = useMatchStore((s) => s.consecutiveTimeouts)

  // Só aparece quando o oponente está desconectado
  if (opp?.connected !== false) return null

  const oppColor = opp.character ? CHARACTER_INFO[opp.character].color : 'var(--color-primary)'
  const oppName = opp.nickname ?? 'Oponente'
  const timeoutCount = consecutiveTimeouts[oppSlot]

  // Timer do oponente: só exibe quando é a vez dele
  const isOppTurn = turn?.player === oppSlot
  const timerDeadline = isOppTurn ? turn : null

  return (
    <>
      {/* Scrim semitransparente — .scrim do esboço */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[4] bg-[rgba(3,4,10,0.66)]"
      />

      {/* Card centrado — .ov-card do esboço */}
      <div
        role="status"
        aria-live="polite"
        aria-label={`${oppName} desconectado. Estouros: ${timeoutCount} de ${MAX_CONSECUTIVE_TIMEOUTS}.`}
        className="pointer-events-none absolute left-[24%] right-[24%] top-1/2 z-[5] -translate-y-1/2 flex flex-col items-center gap-[7px] rounded-[14px] border border-line bg-bg-raised px-3 py-3 text-center"
        style={{ '--opp': oppColor } as CSSProperties}
      >
        {/* Avatar do oponente, desbotado como no esboço (opacity:.5) */}
        <div
          className="grid size-[28px] shrink-0 place-items-center overflow-hidden rounded-full border-2 opacity-50"
          style={{ borderColor: oppColor, boxShadow: `0 0 8px ${oppColor}55` }}
        >
          {opp.character ? (
            <Character id={opp.character} variant="piece" decorative className="size-[78%]" />
          ) : null}
        </div>

        {/* Título: nome + estado — .ttl do esboço */}
        <p
          className="font-display text-[12.5px] font-bold tracking-[0.06em] uppercase"
          style={{ color: oppColor }}
        >
          {oppName} perdeu a conexão
        </p>

        {/* Timer do turno do oponente na cor dele — .tmr.opp do esboço */}
        <div className="w-full">
          <TimerBar
            deadline={timerDeadline}
            color={oppColor}
            warnAtSeconds={0}
            label={`Tempo do turno de ${oppName}`}
          />
        </div>

        {/* Subtexto — font-size 9.5px como no esboço */}
        <p className="font-mono text-[9.5px] text-text-muted">
          Os turnos dele continuam correndo ·{' '}
          <span style={{ color: oppColor }}>
            {timeoutCount}/{MAX_CONSECUTIVE_TIMEOUTS}
          </span>
        </p>
      </div>
    </>
  )
}
