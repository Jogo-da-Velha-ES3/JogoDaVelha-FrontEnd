import { SUDDEN_DEATH_ENTRY_SECONDS } from '../../constants/game'
import { useIsBefore } from '../../hooks/useIsBefore'
import { useMatchStore } from '../../stores/matchStore'

/**
 * true durante a entrada da Morte Súbita: a apresentação do round 3, depois do sorteio e antes do
 * primeiro turno de 5s. Quem reconecta no meio do round não vê a entrada (introStartedAt é null).
 */
export function useSuddenDeathEntrance(): boolean {
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const startedAt = useMatchStore((s) => s.introStartedAt)
  const entering = useIsBefore(
    suddenDeath && startedAt !== null ? startedAt + SUDDEN_DEATH_ENTRY_SECONDS * 1000 : null,
  )
  return suddenDeath && entering
}
