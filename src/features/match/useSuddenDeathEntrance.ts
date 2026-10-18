import { SUDDEN_DEATH_ENTRY_SECONDS } from '../../constants/game'
import { useIsBefore } from '../../hooks/useIsBefore'
import { useMatchStore } from '../../stores/matchStore'

/**
 * true durante a entrada da Morte Súbita: os primeiros segundos do round 3, a partir da chegada
 * do ROUND_START. Quem reconecta no meio do round não vê a entrada (roundStartedAt é null).
 */
export function useSuddenDeathEntrance(): boolean {
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const startedAt = useMatchStore((s) => s.roundStartedAt)
  const entering = useIsBefore(
    suddenDeath && startedAt !== null ? startedAt + SUDDEN_DEATH_ENTRY_SECONDS * 1000 : null,
  )
  return suddenDeath && entering
}
