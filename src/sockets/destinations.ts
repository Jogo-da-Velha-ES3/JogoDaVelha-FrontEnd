// Destinos STOMP (rascunho — ARCHITECTURE.md §6). Ajustar quando a FE-17 fechar.
import type { ClientCommandType } from '../types/events'

/** Eventos públicos da sala */
export const roomTopic = (roomCode: string) => `/topic/rooms/${roomCode}`

/** Eventos privados do jogador (opções do sorteio, deck, erros) */
export const PRIVATE_QUEUE = '/user/queue/room'

const COMMAND_PATHS: Record<ClientCommandType, string> = {
  DRAFT_CHARACTER: '/draft/character',
  DRAFT_ABILITIES: '/draft/abilities',
  DRAW_PICK: '/draw/pick',
  MOVE: '/move',
  USE_ABILITY: '/ability',
  REMATCH_REQUEST: '/rematch/request',
  REMATCH_RESPOND: '/rematch/respond',
  LEAVE: '/leave',
}

export const commandDestination = (roomCode: string, type: ClientCommandType) =>
  `/app/rooms/${roomCode}${COMMAND_PATHS[type]}`
