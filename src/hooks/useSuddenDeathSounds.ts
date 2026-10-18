import { useEffect, useRef } from 'react'
import {
  playSuddenDeathSiren,
  startHeartbeat,
  startSuddenDeathMusic,
  startTickTock,
  stopHeartbeat,
  stopSuddenDeathMusic,
  stopTickTock,
} from '../audio/suddenDeathSounds'

/**
 * Hook para gerenciar os sons da Morte Súbita (FE-13 Parte 5).
 *
 * Chama os ganchos de som nos momentos corretos:
 * - Entrada: trilha acelerada, sirene e batida de coração
 * - Durante: tique-taque nos 3 últimos segundos de qualquer turno
 * - Saída: para todos os sons
 *
 * As chamadas são idempotentes (não disparam múltiplas vezes por re-render).
 *
 * @param suddenDeath - Se está em Morte Súbita (round 3)
 * @param remainingSeconds - Segundos restantes do turno atual (null se não houver turno)
 * @param isPlaying - Se está na fase PLAYING (não ROUND_END, ROUND_DRAW, etc.)
 */
export function useSuddenDeathSounds(
  suddenDeath: boolean,
  remainingSeconds: number | null,
  isPlaying: boolean,
) {
  const entryPlayed = useRef(false)
  const tickTockActive = useRef(false)

  // Entrada da Morte Súbita: trilha, sirene e batida de coração
  useEffect(() => {
    if (suddenDeath && !entryPlayed.current) {
      entryPlayed.current = true

      // Sons de entrada (tocam uma vez)
      startSuddenDeathMusic()
      playSuddenDeathSiren()
      startHeartbeat()
    }

    // Cleanup: para tudo ao sair da Morte Súbita ou desmontar
    return () => {
      if (entryPlayed.current) {
        stopSuddenDeathMusic()
        stopHeartbeat()
        stopTickTock()
        entryPlayed.current = false
        tickTockActive.current = false
      }
    }
  }, [suddenDeath])

  // Tique-taque nos 3 últimos segundos de qualquer turno (próprio ou oponente)
  useEffect(() => {
    if (!suddenDeath || !isPlaying || remainingSeconds === null) {
      // Não está em condições para tique-taque: para se estiver tocando
      if (tickTockActive.current) {
        stopTickTock()
        tickTockActive.current = false
      }
      return
    }

    // Nos 3 últimos segundos: inicia o tique-taque
    if (remainingSeconds >= 1 && remainingSeconds <= 3) {
      if (!tickTockActive.current) {
        startTickTock()
        tickTockActive.current = true
      }
    } else {
      // Fora da faixa de 3 segundos: para o tique-taque
      if (tickTockActive.current) {
        stopTickTock()
        tickTockActive.current = false
      }
    }
  }, [suddenDeath, remainingSeconds, isPlaying])
}
