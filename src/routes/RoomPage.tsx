import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RESULT_HOLD_SECONDS } from '../constants/game'
import { WaitingRoom } from '../features/lobby/WaitingRoom'
import { Arena } from '../features/match'
import { ResultScreen, useRoomExit } from '../features/results'
import { useIsBefore } from '../hooks/useIsBefore'
import { isValidRoomCode } from '../lib/roomCode'
import { joinRoom, leaveRoom } from '../sockets/gameClient'
import { useMatchStore } from '../stores/matchStore'
import { useRoomStore } from '../stores/roomStore'
import { showToast } from '../stores/toastStore'
import { NotFoundPage } from './NotFoundPage'
import { PagePlaceholder } from './PagePlaceholder'
import { PATHS } from './paths'
import { PreparationPlaceholder } from './room/RoomPlaceholders'

/** A sala inteira (Sala de Espera, Preparação, Arena, Resultado), escolhida pela `phase` */
export function RoomPage() {
  const { codigo } = useParams()
  const setPendingRoomCode = useRoomStore((s) => s.setPendingRoomCode)
  const isValid = isValidRoomCode(codigo)

  useEffect(() => {
    if (!isValid) return
    // Chegou na sala: o link direto guardado antes do Acesso já foi usado
    setPendingRoomCode(null)
    joinRoom(codigo).catch((error: unknown) =>
      showToast({
        message: error instanceof Error ? error.message : 'Não foi possível entrar na sala.',
        tone: 'danger',
      }),
    )
    return () => leaveRoom()
  }, [isValid, codigo, setPendingRoomCode])

  // Erros do servidor (jogada inválida, sem conexão…) aparecem como aviso [FE-18]
  const lastError = useRoomStore((s) => s.lastError)
  useEffect(() => {
    if (lastError) showToast({ message: lastError.message, tone: 'danger' })
  }, [lastError])

  // Revanche cancelada para quem pediu ou sala encerrada: avisa e volta ao Hub [RN-POS-02]
  const navigate = useNavigate()
  useRoomExit((message) => {
    showToast({ message, tone: 'info' })
    navigate(PATHS.play)
  })

  if (!isValid) return <NotFoundPage />

  return (
    <div className="flex h-dvh flex-col py-2">
      <ConnectionNotice />
      <RoomScreen code={codigo} />
    </div>
  )
}

/** Faixa enquanto a conexão volta; o estado é remontado pelo snapshot ao reconectar */
function ConnectionNotice() {
  const connection = useRoomStore((s) => s.connection)
  if (connection !== 'RECONNECTING') return null
  return (
    <p
      role="status"
      className="fixed inset-x-0 top-0 z-40 bg-danger py-1 text-center font-display text-sm font-bold tracking-wide text-primary uppercase"
    >
      Reconectando…
    </p>
  )
}

function RoomScreen({ code }: { code: string }) {
  const phase = useRoomStore((s) => s.phase)
  const outcome = useMatchStore((s) => s.outcome)
  const outcomeReceivedAt = useMatchStore((s) => s.outcomeReceivedAt)

  // No W.O. e no empate absoluto, a Arena segura o banner antes do Resultado. Quem reconecta
  // (snapshot) vai direto.
  const holdsArena = outcome?.kind === 'WO' || outcome?.kind === 'ABSOLUTE_DRAW'
  const holdingArena = useIsBefore(
    holdsArena && outcomeReceivedAt !== null
      ? outcomeReceivedAt + RESULT_HOLD_SECONDS * 1000
      : null,
  )

  switch (phase) {
    case null:
      return <PagePlaceholder title={`Sala ${code}`} card="FE-28" owner="Rafael" />
    case 'WAITING':
    case 'MATCHED':
      return <WaitingRoom code={code} />
    case 'DRAFT':
      return <PreparationPlaceholder />
    case 'RESULT':
      return holdingArena ? <Arena /> : <ResultScreen />
    default:
      return <Arena /> // VERSUS, ROUND_DRAW, PLAYING, ROUND_END
  }
}
