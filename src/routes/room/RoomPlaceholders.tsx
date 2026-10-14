// Telas da sala que ainda são de outros cards. Mostram o mínimo para a partida andar de ponta a
// ponta com o servidor simulado; cada card substitui a sua.
import { useNavigate } from 'react-router-dom'
import { Button, TimerBar } from '../../components/ui'
import { PREPARATION_SECONDS } from '../../constants/game'
import { otherSlot } from '../../lib/match'
import { leaveRoom } from '../../sockets/gameClient'
import { useDraftStore } from '../../stores/draftStore'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { PATHS } from '../paths'
import { PagePlaceholder } from '../PagePlaceholder'

export function WaitingRoomPlaceholder({ code }: { code: string }) {
  const phase = useRoomStore((s) => s.phase)
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const opponent = useRoomStore((s) => s.players.find((p) => p.slot === otherSlot(me)))

  return (
    <PagePlaceholder title={`Sala ${code}`} card="FE-26" owner="Vini">
      <p className="font-display text-xl font-bold uppercase">
        {phase === 'MATCHED' && opponent
          ? `Match feito! ${opponent.nickname} entrou!`
          : 'Aguardando adversário…'}
      </p>
    </PagePlaceholder>
  )
}

export function PreparationPlaceholder() {
  const deadline = useDraftStore((s) => s.deadline)

  return (
    <PagePlaceholder title="Preparação" card="FE-09" owner="Matheus">
      <div className="w-64">
        <TimerBar
          deadline={
            deadline
              ? {
                  startedAt: deadline - PREPARATION_SECONDS * 1000,
                  durationSeconds: PREPARATION_SECONDS,
                }
              : null
          }
          label="Tempo da Preparação"
        />
      </div>
      <p className="text-sm text-text-muted">Sem escolha, o servidor escolhe por você.</p>
    </PagePlaceholder>
  )
}

export function ResultPlaceholder() {
  const navigate = useNavigate()
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const outcome = useMatchStore((s) => s.outcome)
  const score = useMatchStore((s) => s.score)
  const coins = useMatchStore((s) => s.coins)

  const title =
    outcome?.kind === 'ABSOLUTE_DRAW'
      ? 'Empate absoluto'
      : outcome?.winner === me
        ? outcome.kind === 'WO'
          ? 'Vitória por W.O.'
          : 'Vitória'
        : outcome?.kind === 'WO'
          ? 'Derrota por W.O.'
          : 'Derrota'

  const leave = () => {
    leaveRoom()
    navigate(PATHS.play)
  }

  return (
    <PagePlaceholder title={title} card="FE-15 / FE-29" owner="Lucas e Rafael">
      <p className="font-display text-xl font-bold">
        {score[me]} × {score[otherSlot(me)]}
      </p>
      <p className="font-mono text-coin">+{coins?.[me] ?? 0} Coins</p>
      <Button variant="secondary" onClick={leave}>
        Voltar ao Hub
      </Button>
    </PagePlaceholder>
  )
}
