import { ROUND_BANNER_SECONDS } from '../../constants/game'
import { useIsBefore } from '../../hooks/useIsBefore'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'

/** O banner de início do round está na tela? (nos primeiros segundos depois do sorteio) */
export function useRoundStartBannerVisible(): boolean {
  const phase = useRoomStore((s) => s.phase)
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const startedAt = useMatchStore((s) => s.introStartedAt)
  const visible = useIsBefore(startedAt !== null ? startedAt + ROUND_BANNER_SECONDS * 1000 : null)
  // No round 3 (suddenDeath) o SuddenDeathLayer trata a entrada; este banner não aparece.
  return visible && !suddenDeath && phase === 'PLAYING'
}
