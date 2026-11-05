import { useEffect } from 'react'
import { roomTrack } from '../../lib/roomMusic'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { playMusic, stopAllMusic } from './soundManager'

/**
 * Troca a trilha conforme a fase da sala (FE-38), pela regra de lib/roomMusic.ts. Só age quando a
 * trilha muda: passar de PLAYING para ROUND_END não chama o motor de novo. Sem fase (entrando na
 * sala), fica a trilha que já estava tocando.
 */
export function useRoomMusic(): void {
  const phase = useRoomStore((s) => s.phase)
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const track = phase === null ? undefined : roomTrack(phase, suddenDeath)

  useEffect(() => {
    if (track === undefined) return
    if (track) playMusic(track)
    else stopAllMusic()
  }, [track])
}
