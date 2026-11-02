import { useNavigate } from 'react-router-dom'
import { Button, TimerBar } from '../../components/ui'
import { REMATCH_WINDOW_SECONDS } from '../../constants/game'
import { RESULT_TEXTS } from '../../constants/texts'
import { useLanguageFilter, useVoice } from '../../hooks/useLanguageFilter'
import { otherSlot } from '../../lib/match'
import { PATHS } from '../../routes/paths'
import { leaveRoom, sendCommand } from '../../sockets/gameClient'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { rematchCancelledMessage } from './rematch'

export interface RematchPanelProps {
  /** "Voltar ao Lobby". Padrão: sai da sala e vai para o Hub */
  onLeave?: () => void
  className?: string
}

/**
 * Revanche e "Voltar ao Lobby" do Resultado (FE-29) [RF-POS-03] [RN-POS-01] [RN-POS-02]
 * [RN-POS-03]. Só manda intenções: o pedido, o prazo de 15s e o cancelamento vêm do servidor, e
 * a revanche aceita chega como PHASE_CHANGE para a Preparação.
 */
export function RematchPanel({ onLeave, className = '' }: RematchPanelProps) {
  const navigate = useNavigate()
  const filterOn = useLanguageFilter()
  const voice = useVoice()
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const opponent = useRoomStore((s) => s.players.find((p) => p.slot === otherSlot(me)))
  const closedReason = useRoomStore((s) => s.closedReason)
  const rematch = useMatchStore((s) => s.rematch)
  const cancelled = useMatchStore((s) => s.rematchCancelled)

  const leave =
    onLeave ??
    (() => {
      leaveRoom()
      navigate(PATHS.play)
    })

  // Sala encerrada: a revanche fica desabilitada na hora [RN-POS-02]
  let ended: string | null = null
  const T = RESULT_TEXTS.rematch
  if (cancelled) {
    ended = rematchCancelledMessage(cancelled.reason, cancelled.requestedBy === me, filterOn)
  } else if (!opponent) ended = voice(T.opponentLeft)
  else if (closedReason !== null) ended = closedReason

  const pending = ended === null ? rematch : null
  const askedByOpponent = pending !== null && pending.requestedBy !== me
  const opponentName = opponent?.nickname ?? T.opponent

  let status: string | null = ended
  if (pending) {
    status = askedByOpponent ? T.opponentWants(opponentName) : T.waiting(opponentName)
  }

  return (
    <div
      role="group"
      aria-label="Revanche"
      className={`flex w-full max-w-sm flex-col items-center gap-2 ${className}`}
    >
      {status && (
        <p
          role="status"
          className={
            askedByOpponent
              ? 'font-display text-xl font-bold tracking-wide uppercase'
              : 'text-sm text-text-muted'
          }
        >
          {status}
        </p>
      )}

      {pending && (
        <TimerBar
          className="w-56"
          deadline={{
            startedAt: pending.deadline - REMATCH_WINDOW_SECONDS * 1000,
            durationSeconds: REMATCH_WINDOW_SECONDS,
          }}
          label="Tempo da revanche"
        />
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {askedByOpponent ? (
          <>
            <Button
              onClick={() => sendCommand({ type: 'REMATCH_RESPOND', payload: { accept: true } })}
            >
              Aceitar
            </Button>
            <Button
              variant="secondary"
              onClick={() => sendCommand({ type: 'REMATCH_RESPOND', payload: { accept: false } })}
            >
              Recusar
            </Button>
          </>
        ) : (
          <Button
            disabled={ended !== null || pending !== null}
            onClick={() => sendCommand({ type: 'REMATCH_REQUEST', payload: {} })}
          >
            {pending ? 'Revanche pedida' : 'Revanche'}
          </Button>
        )}
        <Button variant={askedByOpponent ? 'ghost' : 'secondary'} onClick={leave}>
          Voltar ao Lobby
        </Button>
      </div>
    </div>
  )
}
