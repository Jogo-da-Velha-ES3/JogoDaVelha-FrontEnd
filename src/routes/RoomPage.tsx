import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { ActiveRoomError, enterRoomByLink } from '../api/rooms'
import { RESULT_HOLD_SECONDS } from '../constants/game'
import { ROOM_TEXTS } from '../constants/texts'
import { RoomLoading } from '../features/lobby/RoomLoading'
import { roomScreenClosed, roomScreenOpened } from '../features/lobby/roomRelease'
import { useRoomGoneGuard } from '../features/lobby/useRoomGoneGuard'
import { WaitingRoom } from '../features/lobby/WaitingRoom'
import { Arena } from '../features/match'
import { ResultScreen, useRoomExit } from '../features/results'
import { stopVoice } from '../features/sound/soundManager'
import { useRoomMusic } from '../features/sound/useRoomMusic'
import { useIsBefore } from '../hooks/useIsBefore'
import { isValidRoomCode } from '../lib/roomCode'
import { roomErrorMessage } from '../lib/roomErrors'
import { joinRoom, leaveRoom } from '../sockets/gameClient'
import { showActiveRoom } from '../stores/activeRoomStore'
import { useMatchStore } from '../stores/matchStore'
import { useRoomStore } from '../stores/roomStore'
import { showToast } from '../stores/toastStore'
import { NotFoundPage } from './NotFoundPage'
import { PATHS, type RoomLocationState } from './paths'
import { BackNavigationGuard } from './room/BackNavigationGuard'
import { PreparationPlaceholder } from './room/RoomPlaceholders'

/** A sala inteira (Sala de Espera, Preparação, Arena, Resultado), escolhida pela `phase` */
export function RoomPage() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const setPendingRoomCode = useRoomStore((s) => s.setPendingRoomCode)
  const isValid = isValidRoomCode(codigo)
  // Criar Sala e o modal do código já fizeram o POST /join; o link (e o recarregar) ainda não
  const alreadyJoined = (useLocation().state as RoomLocationState | null)?.joined === true
  /** A conexão com a sala falhou: a tela de entrada mostra o erro e o "Tentar de novo" */
  const [failed, setFailed] = useState(false)
  /** Muda a cada "Tentar de novo" para refazer a entrada */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isValid) return
    // Chegou na sala: o link direto guardado antes do Acesso já foi usado, e o aviso de sala em
    // andamento do Hub fica para trás (AMB-01)
    setPendingRoomCode(null)
    roomScreenOpened(codigo)
    let active = true

    async function enter(code: string) {
      if (!alreadyJoined) {
        try {
          // O back só deixa assinar a sala no STOMP depois do POST /join [RF-HUB-05]
          await enterRoomByLink(code)
        } catch (error) {
          // Sessão vencida: o Acesso já avisa. Sala inexistente, cheia ou começada: volta ao Hub
          if (!active || (error instanceof ApiError && error.status === 401)) return
          // Ainda preso noutra sala: o Hub oferece voltar ou sair dela (AMB-01)
          if (error instanceof ActiveRoomError) showActiveRoom(error.room)
          showToast({
            message: error instanceof ApiError ? error.message : ROOM_TEXTS.errors.joinFailed,
            tone: 'danger',
          })
          navigate(PATHS.play, { replace: true })
          return
        }
        if (!active) return
      }
      await joinRoom(code)
    }

    enter(codigo).catch(() => {
      if (!active) return
      // Sem isto o stompjs tentaria de novo sozinho, sem parar, recusado a cada vez
      leaveRoom()
      setFailed(true)
    })
    return () => {
      active = false
      leaveRoom()
      stopVoice() // a fala do Vitão não segue tocando no Hub (FE-48)
      // Confere pouco depois se o /leave liberou o jogador; se não, sai de novo (AMB-01)
      roomScreenClosed(codigo)
    }
  }, [isValid, codigo, alreadyJoined, attempt, setPendingRoomCode, navigate])

  const retry = () => {
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  // Erros do servidor (jogada inválida, sem conexão…) aparecem como aviso [FE-18], com o motivo
  // pela ação e pela fase (SUG-02); some quando a tela já explica (ex: a revanche)
  const lastError = useRoomStore((s) => s.lastError)
  useEffect(() => {
    if (!lastError) return
    const { rematch, rematchCancelled } = useMatchStore.getState()
    const { phase, closedReason } = useRoomStore.getState()
    const message = roomErrorMessage(lastError, {
      phase,
      rematchShown: rematch !== null || rematchCancelled !== null || closedReason !== null,
    })
    if (message) showToast({ message, tone: 'danger' })
  }, [lastError])

  // Revanche cancelada para quem pediu ou sala encerrada: avisa e volta ao Hub [RN-POS-02]
  const exitToHub = (message: string) => {
    showToast({ message, tone: 'info' })
    navigate(PATHS.play)
  }
  useRoomExit(exitToHub)
  // O back recusou a conexão e a sala não é mais sua (encerrada enquanto você estava fora): Hub
  useRoomGoneGuard(codigo ?? '', exitToHub)

  if (!isValid) return <NotFoundPage />

  return (
    <div className="flex h-dvh flex-col py-2 tiny:py-1">
      <ConnectionNotice />
      {/* Voltar do navegador na partida, no Match feito ou na Preparação pede confirmação (FRT-03) */}
      <BackNavigationGuard />
      <RoomScreen
        code={codigo}
        loading={
          <RoomLoading
            code={codigo}
            failed={failed}
            onRetry={retry}
            onBack={() => navigate(PATHS.play)}
          />
        }
      />
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
      {ROOM_TEXTS.reconnecting}
    </p>
  )
}

/** `loading`: a tela de entrada, até o servidor mandar a fase da sala */
function RoomScreen({ code, loading }: { code: string; loading: ReactNode }) {
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

  // Trilha da Sala, da Arena ou da Morte Súbita; o Resultado fica sem trilha (FE-38)
  useRoomMusic()

  switch (phase) {
    case null:
      return loading
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
