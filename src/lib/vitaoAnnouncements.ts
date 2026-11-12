// Anúncios gravados do Rafik que tocam só a voz, porque o banner já mostra a informação (FE-48):
// Confronto, Round 1 e 2, Round empatado, Empate absoluto e "O oponente perdeu a vez". Lógica pura:
// recebe o evento do servidor e o estado de ANTES dele, e diz qual anúncio toca, ou nenhum.
// Só eventos ao vivo chegam aqui: o snapshot de reconexão não anuncia nada.
import { MAX_CONSECUTIVE_TIMEOUTS } from '../constants/game'
import type { ServerEvent } from '../types/events'
import type { PlayerSlot, RoomPhase } from '../types/game'
import { isMatchPoint, type Score } from './match'

export type Announcement =
  'VERSUS' | 'ROUND_1' | 'ROUND_2' | 'ROUND_DRAW' | 'ABSOLUTE_DRAW' | 'OPPONENT_TIMEOUT'

export interface AnnouncementState {
  phase: RoomPhase | null
  round: number
  score: Score
  suddenDeath: boolean
  mySlot: PlayerSlot | null
}

export function announcementFor(event: ServerEvent, state: AnnouncementState): Announcement | null {
  switch (event.type) {
    case 'PHASE_CHANGE': {
      const { phase } = event.payload
      if (phase === state.phase) return null // repetido
      if (phase === 'VERSUS') return 'VERSUS'
      // O round entra em jogo depois do sorteio. Com match point, a fala do Vitão já anuncia o
      // round; na Morte Súbita, a fala da entrada dela
      if (phase !== 'PLAYING' || state.suddenDeath || isMatchPoint(state.score)) return null
      if (state.round === 1) return 'ROUND_1'
      if (state.round === 2) return 'ROUND_2'
      return null
    }

    case 'ROUND_END':
      if (event.payload.winner !== null) return null
      // Empate no round 3 (a Morte Súbita) é o empate absoluto [RN-ARN-06]
      return state.suddenDeath ? 'ABSOLUTE_DRAW' : 'ROUND_DRAW'

    case 'TURN_TIMEOUT': {
      const { player, consecutiveTimeouts } = event.payload
      // O meu estouro é piada do Vitão; o 3º do oponente é W.O., também com a fala do Vitão
      if (state.mySlot === null || player === state.mySlot) return null
      return consecutiveTimeouts < MAX_CONSECUTIVE_TIMEOUTS ? 'OPPONENT_TIMEOUT' : null
    }

    default:
      return null
  }
}
