import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { WO_RESULT_DELAY_SECONDS } from '../constants/game'
import { Arena } from '../features/match'
import { useIsBefore } from '../hooks/useIsBefore'
import { isValidRoomCode } from '../lib/roomCode'
import { joinRoom, leaveRoom } from '../sockets/gameClient'
import { useMatchStore } from '../stores/matchStore'
import { useRoomStore } from '../stores/roomStore'
import { showToast } from '../stores/toastStore'
import { NotFoundPage } from './NotFoundPage'
import { PagePlaceholder } from './PagePlaceholder'
import {
  PreparationPlaceholder,
  ResultPlaceholder,
  WaitingRoomPlaceholder,
} from './room/RoomPlaceholders'

/** A sala inteira (Sala de Espera, Preparação, Arena, Resultado), escolhida pela `phase` */
export function RoomPage() {
  const { codigo } = useParams()
  const setPendingRoomCode = useRoomStore((s) => s.setPendingRoomCode)
  const isValid = isValidRoomCode(codigo)

  useEffect(() => {
    if (!isValid) return
    // Chegou na sala: o link direto guardado antes do Acesso já foi usado
    setPendingRoomCode(null)
    joinRoom(codigo).catch(() =>
      showToast({ message: 'Não foi possível entrar na sala.', tone: 'danger' }),
    )
    return () => leaveRoom()
  }, [isValid, codigo, setPendingRoomCode])

  if (!isValid) return <NotFoundPage />

  return (
    <div className="flex h-dvh flex-col py-2">
      <RoomScreen code={codigo} />
    </div>
  )
}

function RoomScreen({ code }: { code: string }) {
  const phase = useRoomStore((s) => s.phase)
  const outcome = useMatchStore((s) => s.outcome)
  const outcomeReceivedAt = useMatchStore((s) => s.outcomeReceivedAt)

  // No W.O., a Arena segura o banner antes do Resultado. Quem reconecta (snapshot) vai direto.
  const holdingWo = useIsBefore(
    outcome?.kind === 'WO' && outcomeReceivedAt !== null
      ? outcomeReceivedAt + WO_RESULT_DELAY_SECONDS * 1000
      : null,
  )

  switch (phase) {
    case null:
      return <PagePlaceholder title={`Sala ${code}`} card="FE-28" owner="Rafael" />
    case 'WAITING':
    case 'MATCHED':
      return <WaitingRoomPlaceholder code={code} />
    case 'DRAFT':
      return <PreparationPlaceholder />
    case 'RESULT':
      return holdingWo ? <Arena /> : <ResultPlaceholder />
    default:
      return <Arena /> // VERSUS, ROUND_DRAW, PLAYING, ROUND_END
  }
}
