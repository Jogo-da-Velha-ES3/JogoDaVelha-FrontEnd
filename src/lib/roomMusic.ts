// Trilha de cada fase da sala (FE-38). Regra pura, sem React nem Howler: quem toca é o
// useRoomMusic (features/sound). Uma regra só para a sala e para a vitrine.
import type { RoomPhase } from '../types/game'

/** As trilhas da sala (chaves do banco de sons, em features/sound/soundMap.ts) */
export type RoomTrack = 'trilha-sala' | 'trilha-arena' | 'trilha-morte-subita'

/**
 * Sala de Espera e Preparação: a trilha da Sala. Arena: a da Arena, e a acelerada no round 3
 * (Morte Súbita). Resultado: nenhuma, porque a vinheta de vitória, derrota ou empate é o efeito
 * que toca no MATCH_END; uma trilha por cima tocaria a mesma vinheta duas vezes. No W.O. e no
 * empate absoluto, a fase já é RESULT durante o banner da Arena: a música para ali.
 */
export function roomTrack(phase: RoomPhase, suddenDeath: boolean): RoomTrack | null {
  switch (phase) {
    case 'WAITING':
    case 'MATCHED':
    case 'DRAFT':
      return 'trilha-sala'
    case 'VERSUS':
    case 'ROUND_DRAW':
    case 'PLAYING':
    case 'ROUND_END':
      return suddenDeath ? 'trilha-morte-subita' : 'trilha-arena'
    case 'RESULT':
      return null
  }
}
