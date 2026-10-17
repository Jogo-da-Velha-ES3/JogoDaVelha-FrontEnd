// Telas da sala que ainda são de outros cards. Mostram o mínimo para a partida andar de ponta a
// ponta com o servidor simulado; cada card substitui a sua.
import { RematchPanel } from '../../features/results'
import { Preparation } from '../../features/draft/Preparation'
import { otherSlot } from '../../lib/match'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
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
  return <Preparation />
}

export function ResultPlaceholder() {
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

  return (
    <PagePlaceholder title={title} card="FE-15" owner="Lucas">
      <p className="font-display text-xl font-bold">
        {score[me]} × {score[otherSlot(me)]}
      </p>
      <p className="font-mono text-coin">+{coins?.[me] ?? 0} Coins</p>
      <RematchPanel />
    </PagePlaceholder>
  )
}
