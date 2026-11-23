// Aviso de sala em andamento (AMB-01): o servidor diz que o jogador ainda está numa sala
// (`GET /rooms/active`), e o Hub oferece voltar para ela ou sair. Sem fechar por fora: enquanto
// estiver na sala, o jogador não consegue criar nem entrar em outra.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal } from '../../components/ui'
import { ROOM_TEXTS } from '../../constants/texts'
import { activeRoomLeaveConsequence, activeRoomMoment, type ActiveRoom } from '../../lib/activeRoom'
import { enterGameFullscreen } from '../../pwa/gameFullscreen'
import { JOINED_ROOM_STATE, roomPath } from '../../routes/paths'
import { clearActiveRoom, showActiveRoom, useActiveRoomStore } from '../../stores/activeRoomStore'
import { showToast } from '../../stores/toastStore'
import { leaveActiveRoom } from '../lobby/roomRelease'
import { QuitModal } from '../match/QuitModal'

const T = ROOM_TEXTS.active

export function ActiveRoomModal() {
  const room = useActiveRoomStore((s) => s.room)
  // Montado só com a sala: outra sala começa sem confirmação, erro ou "Saindo…" da anterior
  return room ? <ActiveRoomPrompt key={room.code} room={room} /> : null
}

function ActiveRoomPrompt({ room }: { room: ActiveRoom }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const texts = T[activeRoomMoment(room.phase)]
  const consequence = activeRoomLeaveConsequence(room.phase)

  function goBack() {
    // Android: tela cheia já no toque, como no Criar sala (FRT-02)
    enterGameFullscreen()
    clearActiveRoom()
    // O jogador já é da sala: pula o POST /join, e o snapshot escolhe a tela pela fase
    navigate(roomPath(room.code), { state: JOINED_ROOM_STATE })
  }

  async function leave() {
    setConfirming(false)
    setLeaving(true)
    setError(null)
    const outcome = await leaveActiveRoom(room)
    if (outcome.status === 'RELEASED') {
      clearActiveRoom(room.code)
      showToast({ message: T.left(room.code), tone: 'info' })
      return
    }
    // Ainda na sala (talvez noutra fase) ou sem resposta: o aviso continua, com o erro
    if (outcome.status === 'STILL_THERE' && outcome.room.phase !== room.phase) {
      showActiveRoom(outcome.room)
    }
    setLeaving(false)
    setError(T.leaveFailed)
  }

  // Sair custa algo ao oponente (desistência, sala fechada): a mesma confirmação da sala (FRT-03)
  if (confirming && consequence) {
    return (
      <QuitModal
        open
        variant={consequence === 'FORFEIT' ? 'forfeit' : 'closeRoom'}
        onContinue={() => setConfirming(false)}
        onQuit={() => void leave()}
      />
    )
  }

  return (
    <Modal
      open
      title={texts.title}
      dismissible={false}
      size="sm"
      actions={
        <div className="flex w-full gap-3">
          <Button
            variant="ghost"
            size="sm"
            block
            disabled={leaving}
            onClick={() => (consequence ? setConfirming(true) : void leave())}
          >
            {leaving ? T.leaving : texts.leave}
          </Button>
          {room.canReturn && (
            <Button size="sm" block disabled={leaving} onClick={goBack}>
              {texts.back}
            </Button>
          )}
        </div>
      }
    >
      <p className="py-1 text-sm tall:text-lg">
        {room.canReturn ? texts.body(room.code) : T.cannotReturn(room.code)}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger tall:text-base">
          {error}
        </p>
      )}
    </Modal>
  )
}
