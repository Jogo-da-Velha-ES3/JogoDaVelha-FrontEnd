import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TimerBar } from '../../components/ui'
import { REMATCH_WINDOW_SECONDS } from '../../constants/game'
import { RESULT_TEXTS } from '../../constants/texts'
import { useLanguageFilter, useVoice } from '../../hooks/useLanguageFilter'
import { usePendingIntent } from '../../hooks/usePendingIntent'
import { otherSlot } from '../../lib/match'
import { PATHS } from '../../routes/paths'
import { leaveRoom } from '../../sockets/gameClient'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { rematchCancelledMessage } from './rematch'
import { playVoice } from '../sound/soundManager'
import { OPPONENT_LEFT_VOICE, pickVoice } from '../vitao/vitaoVoices'
import { roomClosedMessage } from './roomClosed'

type RematchIntent = 'REQUEST' | 'ACCEPT' | 'DECLINE'

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
  const phase = useRoomStore((s) => s.phase)
  const rematch = useMatchStore((s) => s.rematch)
  const cancelled = useMatchStore((s) => s.rematchCancelled)
  // Cada toque trava o botão até o servidor responder (AMB-02): a resposta é o pedido aparecer,
  // ser cancelado, a sala fechar ou a fase mudar (revanche aceita), ou um erro
  const answer = [
    rematch?.requestedBy,
    rematch?.deadline,
    cancelled?.reason,
    closedReason,
    phase,
  ].join('|')
  const { pending: sending, send } = usePendingIntent<RematchIntent>(answer)
  /** Toquei em Revanche: se o pedido do oponente chegar antes do meu, vale como aceite */
  const wantsRematch = useRef(false)

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
  else if (closedReason !== null) ended = roomClosedMessage(closedReason)

  // "O oponente sentiu a pressão, neném!" com a voz do Rafik (FE-48): toca quando ele sai com a
  // tela aberta, não quando a tela já abre assim
  const opponentLeft = cancelled ? cancelled.reason === 'LEFT' : !opponent
  const wasLeft = useRef(opponentLeft)
  useEffect(() => {
    if (opponentLeft && !wasLeft.current) playVoice(pickVoice(OPPONENT_LEFT_VOICE, filterOn))
    wasLeft.current = opponentLeft
  }, [opponentLeft, filterOn])

  const pending = ended === null ? rematch : null
  const askedByOpponent = pending !== null && pending.requestedBy !== me
  const opponentName = opponent?.nickname ?? T.opponent

  let status: string | null = ended
  if (pending) {
    status = askedByOpponent ? T.opponentWants(opponentName) : T.waiting(opponentName)
  }

  // Os dois pediram juntos: o pedido do oponente chegou primeiro e o back recusa o segundo. Pela
  // regra, os dois pedidos valem como aceite (PROJECT_CONTEXT §7)
  useEffect(() => {
    if (!askedByOpponent || !wantsRematch.current) return
    wantsRematch.current = false
    send('ACCEPT', { type: 'REMATCH_RESPOND', payload: { accept: true } })
  }, [askedByOpponent, send])

  const request = () => {
    wantsRematch.current = true
    send('REQUEST', { type: 'REMATCH_REQUEST', payload: {} })
  }

  return (
    <div
      role="group"
      aria-label="Revanche"
      className={`flex w-full max-w-sm flex-col items-center gap-2 tall:max-w-md tall:gap-3 ${className}`}
    >
      {status && (
        <p
          role="status"
          className={
            askedByOpponent
              ? 'font-display text-xl font-bold tracking-wide uppercase tall:text-3xl'
              : 'text-sm text-text-muted tall:text-lg'
          }
        >
          {status}
        </p>
      )}

      {pending && (
        <TimerBar
          className="w-56 tall:w-80"
          deadline={{
            startedAt: pending.deadline - REMATCH_WINDOW_SECONDS * 1000,
            durationSeconds: REMATCH_WINDOW_SECONDS,
          }}
          label="Tempo da revanche"
        />
      )}

      <div className="flex flex-wrap justify-center gap-2 tall:gap-3">
        {askedByOpponent ? (
          <>
            <Button
              disabled={sending !== null}
              onClick={() => send('ACCEPT', { type: 'REMATCH_RESPOND', payload: { accept: true } })}
            >
              {sending === 'ACCEPT' ? 'Aceitando…' : 'Aceitar'}
            </Button>
            <Button
              variant="secondary"
              disabled={sending !== null}
              onClick={() =>
                send('DECLINE', { type: 'REMATCH_RESPOND', payload: { accept: false } })
              }
            >
              {sending === 'DECLINE' ? 'Recusando…' : 'Recusar'}
            </Button>
          </>
        ) : (
          <Button
            disabled={ended !== null || pending !== null || sending !== null}
            onClick={request}
          >
            {sending === 'REQUEST' ? 'Pedindo…' : pending ? 'Revanche pedida' : 'Revanche'}
          </Button>
        )}
        <Button variant={askedByOpponent ? 'ghost' : 'secondary'} onClick={leave}>
          Voltar ao Lobby
        </Button>
      </div>
    </div>
  )
}
