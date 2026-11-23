import { useEffect, useEffectEvent, useRef } from 'react'
import { checkActiveRoom } from '../../api/rooms'
import { ROOM_TEXTS } from '../../constants/texts'
import { CONNECTION_REFUSED } from '../../lib/roomErrors'
import { showActiveRoom } from '../../stores/activeRoomStore'
import { useRoomStore } from '../../stores/roomStore'

/**
 * O back recusou a conexão com a sala (ex: ela foi encerrada enquanto você estava fora e ele não
 * deixa mais assinar): pergunta se a sala ainda é sua. Se não é, chama `onGone` com o aviso, em vez
 * de a tela ficar presa no "Entrando na sala…" ou na partida parada, tentando de novo (AMB-01). Se
 * ainda é, ou se não deu para saber, a conexão segue tentando, como antes.
 */
export function useRoomGoneGuard(code: string, onGone: (message: string) => void) {
  const lastError = useRoomStore((s) => s.lastError)
  const gone = useEffectEvent(onGone)
  /** A recusa se repete a cada nova tentativa da conexão: uma pergunta por vez */
  const checking = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (lastError?.code !== CONNECTION_REFUSED || checking.current) return
    checking.current = true
    void checkActiveRoom().then((check) => {
      checking.current = false
      if (!mounted.current) return
      if (check.status === 'NONE') {
        gone(ROOM_TEXTS.closed.other)
      } else if (check.status === 'FOUND' && check.room.code !== code) {
        // Ainda preso noutra sala: o Hub oferece voltar ou sair dela
        showActiveRoom(check.room)
        gone(ROOM_TEXTS.errors.inRoom(check.room.code))
      }
    })
  }, [lastError, code])
}
