// Contrato de eventos com o back (rascunho — ARCHITECTURE.md §6). Ajustar quando a FE-17 fechar.
import type {
  AbilityId,
  Cell,
  CharacterId,
  DeckSlot,
  MatchOutcome,
  PlayerSlot,
  PlayerState,
  RoomSnapshot,
  TurnState,
} from './game'

/** Envelope de toda mensagem que chega do servidor. */
export interface ServerEnvelope<T extends ServerEvent = ServerEvent> {
  type: T['type']
  payload: T['payload']
  /** Relógio do servidor (ms), usado para sincronizar timers */
  serverTime: number
}

export type ServerEvent =
  | { type: 'ROOM_SNAPSHOT'; payload: RoomSnapshot }
  | { type: 'PLAYER_JOINED'; payload: { player: PlayerState } }
  | { type: 'PLAYER_LEFT'; payload: { slot: PlayerSlot } }
  | { type: 'PLAYER_DISCONNECTED'; payload: { slot: PlayerSlot; reconnectDeadline: number } }
  | { type: 'PLAYER_RECONNECTED'; payload: { slot: PlayerSlot } }
  | {
      type: 'DRAFT_UPDATE'
      payload: {
        deadline: number
        /** Personagem reservado por cada jogador (bloqueado para o outro) */
        characters: Partial<Record<PlayerSlot, CharacterId>>
        ready: Record<PlayerSlot, boolean>
      }
    }
  | { type: 'DRAW_OPTIONS'; payload: { options: AbilityId[]; deadline: number } }
  | {
      type: 'ROUND_START'
      payload: { round: number; startingPlayer: PlayerSlot; suddenDeath: boolean; deck: DeckSlot[] }
    }
  | { type: 'TURN_START'; payload: TurnState }
  | { type: 'BOARD_UPDATE'; payload: { board: Cell[] } }
  | {
      type: 'ABILITY_RESOLVED'
      payload: {
        by: PlayerSlot
        ability: AbilityId
        targetCell: number | null
        destinationCell: number | null
        /** Anulada pelo Campo de Força do alvo [RN-ARN-04] */
        absorbed: boolean
        /** Tornado/Troca Rápida sem casa vizinha livre [RN-ARN-05] */
        noEffect: boolean
      }
    }
  | { type: 'TURN_TIMEOUT'; payload: { player: PlayerSlot; consecutiveTimeouts: number } }
  | {
      type: 'ROUND_END'
      payload: {
        round: number
        winner: PlayerSlot | null // null = round empatado
        winningLine: number[] | null
        score: Record<PlayerSlot, number>
      }
    }
  | {
      type: 'MATCH_END'
      payload: { outcome: MatchOutcome; coins: Record<PlayerSlot, number> }
    }
  | { type: 'REMATCH_REQUESTED'; payload: { by: PlayerSlot; deadline: number } }
  | { type: 'REMATCH_CANCELLED'; payload: { reason: 'TIMEOUT' | 'DECLINED' | 'LEFT' } }
  | { type: 'ROOM_CLOSED'; payload: { reason: string } }
  | { type: 'ERROR'; payload: { code: string; message: string } }

export type ServerEventType = ServerEvent['type']

/** Intenções que o cliente envia. O servidor valida e responde com eventos. */
export type ClientCommand =
  | { type: 'DRAFT_CHARACTER'; payload: { character: CharacterId } }
  | { type: 'DRAFT_ABILITIES'; payload: { abilities: [AbilityId, AbilityId] } }
  | { type: 'DRAW_PICK'; payload: { ability: AbilityId } }
  | { type: 'MOVE'; payload: { cell: number } }
  | {
      type: 'USE_ABILITY'
      payload: { ability: AbilityId; targetCell?: number; destinationCell?: number }
    }
  | { type: 'REMATCH_REQUEST'; payload: Record<string, never> }
  | { type: 'REMATCH_RESPOND'; payload: { accept: boolean } }
  | { type: 'LEAVE'; payload: Record<string, never> }

export type ClientCommandType = ClientCommand['type']
