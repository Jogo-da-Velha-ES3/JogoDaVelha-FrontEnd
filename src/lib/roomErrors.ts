// Aviso de uma ação recusada pelo servidor (SUG-02). O back manda o mesmo erro genérico
// ("A ação não pode ser realizada no estado atual.") para quase tudo, mas diz qual ação falhou: a
// mensagem sai da ação, do código e da fase em que a sala está quando o erro chega.
import { ROOM_TEXTS } from '../constants/texts'
import type { ClientCommandType } from '../types/events'
import type { RoomPhase } from '../types/game'

export interface RoomError {
  code: string
  message: string
  /** A intenção recusada, quando o back diz qual foi */
  command?: ClientCommandType
}

export interface RoomErrorContext {
  phase: RoomPhase | null
  /** O Resultado já mostra a revanche (pedido em aberto, cancelamento ou sala encerrada) */
  rematchShown: boolean
}

const T = ROOM_TEXTS.actionErrors

/** Erro genérico do back para ação fora de hora */
const GENERIC_CONFLICT = 'ROOM_CONFLICT'

/** Passar a vez sem ter jogado nem usado habilidade (BE-046) */
export const END_TURN_WITHOUT_ACTION = 'END_TURN_WITHOUT_ACTION'

/**
 * Erro local: o back recusou a conexão já aberta (ex: a assinatura de uma sala da qual o jogador
 * não faz mais parte). A tela confere se a sala ainda é dele (AMB-01)
 */
export const CONNECTION_REFUSED = 'CONNECTION_ERROR'

/** O texto do aviso, ou null quando a tela já explica o que aconteceu */
export function roomErrorMessage(error: RoomError, context: RoomErrorContext): string | null {
  const { code, command, message } = error
  const { phase } = context
  switch (command) {
    case 'MOVE':
    case 'USE_ABILITY':
    case 'END_TURN':
      // Jogada que chegou no fim do round, no sorteio ou no VS: o próximo turno ainda não começou
      if (phase !== 'PLAYING' || code === 'DRAFT_IN_PROGRESS' || code === 'ROUND_FINISHED')
        return T.waitRound
      if (code === 'NOT_YOUR_TURN') return T.notYourTurn
      if (code === 'TURN_EXPIRED') return T.turnOver
      // 1 jogada e 1 habilidade por turno (BE-046)
      if (code === 'MOVE_ALREADY_USED') return T.moveAlreadyUsed
      if (code === 'SKILL_ACTION_ALREADY_USED') return T.abilityAlreadyUsed
      if (code === END_TURN_WITHOUT_ACTION) return T.endTurnWithoutAction
      // "Passar a vez" fora da vez vem como FORBIDDEN e, com o prazo vencido, como o conflito
      // genérico (a jogada usa NOT_YOUR_TURN e TURN_EXPIRED)
      if (command === 'END_TURN' && code === 'FORBIDDEN') return T.notYourTurn
      if (command === 'END_TURN' && code === GENERIC_CONFLICT) return T.turnOver
      return code === GENERIC_CONFLICT ? T.notNow : message
    case 'DRAW_PICK':
      if (phase !== 'ROUND_DRAW') return T.drawOver
      return code === GENERIC_CONFLICT ? T.notNow : message
    case 'DRAFT_CHARACTER':
    case 'DRAFT_ABILITIES':
      if (phase !== 'DRAFT') return T.draftOver
      return code === GENERIC_CONFLICT ? T.notNow : message
    case 'REMATCH_REQUEST':
    case 'REMATCH_RESPOND':
      // Ex: os dois pediram juntos, ou o prazo acabou: o painel da revanche já mostra o estado
      return context.rematchShown ? null : T.notNow
    case 'LEAVE':
      return null // quem sai já está indo para o Hub
    default:
      return message
  }
}
