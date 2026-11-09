// Eventos do servidor e intenções do cliente, no vocabulário do front. O contrato V2 do back
// (ARCHITECTURE.md §6) é traduzido para estes tipos em src/sockets/envelope.ts e destinations.ts.
import type {
  AbilityId,
  Cell,
  CharacterId,
  DeckSlot,
  MatchOutcome,
  PlayerSlot,
  PlayerState,
  RoomPhase,
  RoomSnapshot,
  TurnState,
} from './game'

/** Envelope de toda mensagem que chega do servidor. */
export interface ServerEnvelope<T extends ServerEvent = ServerEvent> {
  type: T['type']
  payload: T['payload']
  /** Relógio do servidor (ms), usado para sincronizar timers */
  serverTime: number
  /** Gerado no próprio front (ex: "sem conexão"): não sincroniza o relógio */
  local?: boolean
}

/**
 * Por que a sala foi encerrada (`ROOM_CLOSED`). PLAYER_LEFT: alguém saiu depois do MATCH FEITO e
 * antes da partida; RETURN_TO_LOBBY: alguém voltou ao lobby no Resultado.
 */
export type RoomClosedReason =
  | 'HOST_LEFT'
  | 'PLAYER_LEFT'
  | 'EXPIRED'
  | 'REMATCH_DECLINED'
  | 'REMATCH_EXPIRED'
  | 'RETURN_TO_LOBBY'
  | 'REMATCH_DISCONNECTED'

export type ServerEvent =
  | { type: 'ROOM_SNAPSHOT'; payload: RoomSnapshot }
  | { type: 'PLAYER_JOINED'; payload: { player: PlayerState } }
  | { type: 'PLAYER_LEFT'; payload: { slot: PlayerSlot } }
  /**
   * Caiu ou voltou. Sem prazo especial: os turnos de quem caiu continuam correndo e 3 estouros
   * seguidos dão W.O. (regra fechada com o back em 15/10) [RN-ARN-01]
   */
  | { type: 'PLAYER_DISCONNECTED'; payload: { slot: PlayerSlot } }
  | { type: 'PLAYER_RECONNECTED'; payload: { slot: PlayerSlot } }
  | {
      type: 'DRAFT_UPDATE'
      payload: {
        deadline: number
        /** Personagem reservado por cada jogador (bloqueado para o outro) */
        characters: Partial<Record<PlayerSlot, CharacterId>>
        ready: Record<PlayerSlot, boolean>
        /**
         * Cresce a cada mudança do Draft: com os dois escolhendo juntos, os avisos podem chegar fora
         * de ordem, e o mais antigo é descartado. Cada Draft (inclusive o da revanche) começa em 0
         */
        version?: number
      }
    }
  /** Troca de fase da sala: decide a tela de /sala/:codigo */
  | { type: 'PHASE_CHANGE'; payload: { phase: RoomPhase; round?: number } }
  | { type: 'DRAW_OPTIONS'; payload: { options: AbilityId[]; deadline: number } }
  | {
      type: 'ROUND_START'
      payload: { round: number; startingPlayer: PlayerSlot; suddenDeath: boolean }
    }
  /**
   * Meu deck (privado): no sorteio de cada round e depois de cada habilidade usada. Fora do
   * ROUND_START, que é público, para o oponente não ver.
   */
  | { type: 'DECK_UPDATE'; payload: { deck: DeckSlot[] } }
  | {
      type: 'TURN_START'
      payload: TurnState & {
        /** Estouros seguidos de cada lado, valor oficial. Zeram quando o jogador age [RN-ARN-01] */
        consecutiveTimeouts: Record<PlayerSlot, number>
        /** Quem está silenciado neste turno. Sem o campo (simulado), o front deduz do Silêncio */
        silenced?: Record<PlayerSlot, boolean>
      }
    }
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
  | { type: 'ROOM_CLOSED'; payload: { reason: RoomClosedReason } }
  | { type: 'ERROR'; payload: { code: string; message: string } }

export type ServerEventType = ServerEvent['type']

/** Intenções que o cliente envia. O servidor valida e responde com eventos. */
export type ClientCommand =
  | { type: 'DRAFT_CHARACTER'; payload: { character: CharacterId } }
  | { type: 'DRAFT_ABILITIES'; payload: { abilities: [AbilityId, AbilityId] } }
  | {
      type: 'DRAW_PICK'
      /**
       * Com o deck incompleto (round 1), a carta entra no deck. Com o deck completo (do round 2
       * em diante), `abilityToRemove` diz qual habilidade do deck sai, e é obrigatório
       */
      payload: { ability: AbilityId; abilityToRemove?: AbilityId }
    }
  | { type: 'MOVE'; payload: { cell: number } }
  | {
      type: 'USE_ABILITY'
      payload: { ability: AbilityId; targetCell?: number; destinationCell?: number }
    }
  | { type: 'REMATCH_REQUEST'; payload: Record<string, never> }
  | { type: 'REMATCH_RESPOND'; payload: { accept: boolean } }
  | { type: 'LEAVE'; payload: Record<string, never> }

export type ClientCommandType = ClientCommand['type']
