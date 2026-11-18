// O que acontece quando o jogador sai da sala em cada fase (o `/leave` do back, ARCHITECTURE §6).
// Serve para pedir confirmação antes de sair pelo voltar do navegador (FRT-03).
import type { RoomPhase } from '../types/game'

/**
 * - `FORFEIT`: na partida, sair é desistência e o oponente vence por W.O.
 * - `CLOSE_ROOM`: no Match feito e na Preparação, a sala fecha sem partida e o oponente volta ao
 *   Hub
 * - `null`: sair não custa nada ao outro (Sala de Espera, Resultado, ainda entrando)
 */
export type LeaveConsequence = 'FORFEIT' | 'CLOSE_ROOM'

export function leaveConsequence(phase: RoomPhase | null): LeaveConsequence | null {
  switch (phase) {
    case 'MATCHED':
    case 'DRAFT':
      return 'CLOSE_ROOM'
    case 'VERSUS':
    case 'ROUND_DRAW':
    case 'PLAYING':
    case 'ROUND_END':
      return 'FORFEIT'
    default:
      return null
  }
}
