import { ROUND_BANNER_SECONDS } from '../../constants/game'
import { useIsBefore } from '../../hooks/useIsBefore'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'

/** O banner de início do round está na tela? (o sorteio da 3ª habilidade espera ele sair) */
export function useRoundStartBannerVisible(): boolean {
  const phase = useRoomStore((s) => s.phase)
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const startedAt = useMatchStore((s) => s.roundStartedAt)
  const visible = useIsBefore(startedAt !== null ? startedAt + ROUND_BANNER_SECONDS * 1000 : null)
  // No round 3 (suddenDeath) o SuddenDeathLayer trata a entrada; este banner não aparece.
  return visible && !suddenDeath && (phase === 'ROUND_DRAW' || phase === 'PLAYING')
}
