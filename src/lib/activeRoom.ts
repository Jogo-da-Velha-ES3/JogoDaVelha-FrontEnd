// Sala em que o jogador ainda está, pelo `GET /rooms/active` do back (AMB-01): quem fechou o app no
// meio da sala volta pelo Hub em vez de ficar preso a ela. Regras puras, sem React.
import type { RoomPhase } from '../types/game'
import { isValidRoomCode } from './roomCode'
import { leaveConsequence, type LeaveConsequence } from './roomExit'

/** As fases que o back manda no `GET /rooms/active` */
export const ACTIVE_ROOM_PHASES = ['WAITING', 'MATCHED', 'DRAFT', 'PLAYING', 'RESULT'] as const

export type ActiveRoomPhase = (typeof ACTIVE_ROOM_PHASES)[number]

export interface ActiveRoom {
  code: string
  /** null: uma fase que o front não conhece (o aviso fica genérico) */
  phase: ActiveRoomPhase | null
  /** false: o back diz que não dá para voltar; só resta sair */
  canReturn: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isActiveRoomPhase = (value: unknown): value is ActiveRoomPhase =>
  (ACTIVE_ROOM_PHASES as readonly unknown[]).includes(value)

/**
 * Lê o corpo do `200` do `GET /rooms/active`. Sem código de 4 dígitos ou sem `canReturn`, a resposta
 * é inesperada e vale `null`: o front não sabe para onde levar o jogador.
 */
export function parseActiveRoom(data: unknown): ActiveRoom | null {
  if (!isRecord(data) || !isValidRoomCode(data.code as string | undefined)) return null
  if (typeof data.canReturn !== 'boolean') return null
  return {
    code: data.code as string,
    phase: isActiveRoomPhase(data.phase) ? data.phase : null,
    canReturn: data.canReturn,
  }
}

/**
 * O momento da sala, que escolhe o texto do aviso do Hub. A tela de verdade (Sala de Espera, Match
 * feito, Preparação, Arena ou Resultado) é escolhida pelo snapshot quando o jogador volta.
 */
export type ActiveRoomMoment = 'WAITING' | 'PREPARATION' | 'MATCH' | 'RESULT' | 'OTHER'

export function activeRoomMoment(phase: ActiveRoomPhase | null): ActiveRoomMoment {
  switch (phase) {
    case 'WAITING':
      return 'WAITING'
    case 'MATCHED':
    case 'DRAFT':
      return 'PREPARATION'
    case 'PLAYING':
      return 'MATCH'
    case 'RESULT':
      return 'RESULT'
    default:
      return 'OTHER'
  }
}

/**
 * O que sair custa ao oponente, para pedir a mesma confirmação da sala (FRT-03): desistência na
 * partida, sala fechada no Match feito e na Preparação. Numa fase desconhecida, pede a confirmação
 * de fechar a sala, porque pode haver alguém nela.
 */
export function activeRoomLeaveConsequence(phase: ActiveRoomPhase | null): LeaveConsequence | null {
  if (phase === null) return 'CLOSE_ROOM'
  return leaveConsequence(phase satisfies RoomPhase)
}
