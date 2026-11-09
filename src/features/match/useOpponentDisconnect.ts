import { otherSlot } from '../../lib/match'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'

/**
 * Para o aviso "Oponente desconectado" da Arena (FE-05). Não há contagem especial: os turnos de
 * quem caiu continuam correndo e 3 estouros seguidos dão W.O. (regra fechada com o back em
 * 15/10) [RN-ARN-01]. Então o aviso mostra os estouros dele (x/3), que vêm do servidor.
 */
export function useOpponentDisconnect() {
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const disconnected = useRoomStore(
    (s) => s.players.find((p) => p.slot === otherSlot(me))?.connected === false,
  )
  const consecutiveTimeouts = useMatchStore((s) => s.consecutiveTimeouts[otherSlot(me)])
  return { disconnected, consecutiveTimeouts }
}
