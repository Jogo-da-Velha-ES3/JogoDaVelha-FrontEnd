// Telas da sala que ainda são de outros cards. Mostram o mínimo para a partida andar de ponta a
// ponta com o servidor simulado; cada card substitui a sua.
import { Preparation } from '../../features/draft/Preparation'
import { otherSlot } from '../../lib/match'
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
