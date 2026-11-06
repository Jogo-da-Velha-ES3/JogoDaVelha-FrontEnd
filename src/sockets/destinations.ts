// Destinos STOMP do contrato V2 do back (docs/contrato-integracao-v2.md no repositório do back).
import type { ClientCommand } from '../types/events'

/** Eventos públicos da sala */
export const roomTopic = (roomCode: string) => `/topic/rooms/${roomCode}`

/** Eventos privados do jogador (snapshot completo, opções do sorteio, deck, queda do oponente) */
export const PRIVATE_QUEUE = '/user/queue/room'

/** Erros das minhas ações, no formato de erro do REST (`{ code, message, ... }`) */
export const ERRORS_QUEUE = '/user/queue/errors'

/** Avisa que o jogador entrou (ou voltou) na sala; o servidor responde com o ROOM_SNAPSHOT */
export const joinDestination = (roomCode: string) => `/app/rooms/${roomCode}/connect`

export interface BackCommand {
  destination: string
  body: string
}

/**
 * Traduz a intenção do front para o destino e o corpo que o back espera. Os nomes do back
 * (`position`, `skillCode`...) ficam só aqui: o resto do front usa os seus.
 */
export function toBackCommand(roomCode: string, command: ClientCommand): BackCommand {
  const to = (path: string, body: object = {}): BackCommand => ({
    destination: `/app/rooms/${roomCode}${path}`,
    body: JSON.stringify(body),
  })
  switch (command.type) {
    case 'DRAFT_CHARACTER':
      return to('/draft/character', command.payload)
    case 'DRAFT_ABILITIES':
      return to('/draft/abilities', command.payload)
    case 'DRAW_PICK':
      // Sem `abilityToRemove`: a carta nova entra no lugar da sorteada anterior [RN-DRAFT-02]
      return to('/draw/pick', command.payload)
    case 'MOVE':
      return to('/move', { position: command.payload.cell })
    case 'USE_ABILITY': {
      const { ability, targetCell, destinationCell } = command.payload
      return to('/ability', {
        skillCode: ability,
        targetPosition: targetCell,
        destinationPosition: destinationCell,
      })
    }
    case 'REMATCH_REQUEST':
      return to('/rematch/request')
    case 'REMATCH_RESPOND':
      return to(command.payload.accept ? '/rematch/accept' : '/rematch/decline')
    case 'LEAVE':
      // Vale em qualquer fase: o servidor decide (encerra a sala, desistência ou volta ao lobby)
      return to('/leave')
  }
}
