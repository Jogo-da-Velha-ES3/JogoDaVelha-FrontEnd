import { ROOM_TEXTS } from '../../constants/texts'
import type { RoomClosedReason } from '../../types/events'

/**
 * Aviso para quem ficou quando o servidor encerra a sala. Quem saiu já deixou a tela, então
 * "saiu" é sempre o oponente.
 */
export function roomClosedMessage(reason: RoomClosedReason): string {
  const T = ROOM_TEXTS.closed
  switch (reason) {
    case 'PLAYER_LEFT':
    case 'RETURN_TO_LOBBY':
    case 'REMATCH_DISCONNECTED':
      return T.opponentLeft
    case 'EXPIRED':
      return T.expired
    case 'REMATCH_DECLINED':
      return T.rematchDeclined
    case 'REMATCH_EXPIRED':
      return T.rematchExpired
    default:
      return T.other
  }
}
