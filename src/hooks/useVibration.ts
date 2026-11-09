import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

/**
 * Hook para vibrar o celular nos 3 últimos segundos do turno na Morte Súbita.
 * Respeita a vibração das Configurações (FE-39).
 * Não quebra em dispositivos sem suporte a vibração (iPhone/desktop).
 *
 * @param remainingSeconds - Segundos restantes do turno (do useServerTimer)
 * @param isMyTurn - Se é o turno do jogador atual
 * @param suddenDeath - Se está em Morte Súbita
 */
export function useSuddenDeathVibration(
  remainingSeconds: number | null,
  isMyTurn: boolean,
  suddenDeath: boolean,
) {
  const vibrationEnabled = useSettingsStore((s) => s.vibrationOn)
  const lastVibratedSecond = useRef<number | null>(null)

  useEffect(() => {
    // Só vibra se todas as condições forem verdadeiras
    if (!vibrationEnabled || !isMyTurn || !suddenDeath || remainingSeconds === null) {
      lastVibratedSecond.current = null
      return
    }

    // Vibra apenas nos 3 últimos segundos: 3, 2, 1
    if (remainingSeconds >= 1 && remainingSeconds <= 3) {
      // Evita vibrar múltiplas vezes no mesmo segundo
      if (lastVibratedSecond.current !== remainingSeconds) {
        lastVibratedSecond.current = remainingSeconds

        // Vibração de 150ms (opcional: não quebra em dispositivos sem suporte)
        navigator.vibrate?.(150)
      }
    } else {
      lastVibratedSecond.current = null
    }
  }, [remainingSeconds, isMyTurn, suddenDeath, vibrationEnabled])
}
