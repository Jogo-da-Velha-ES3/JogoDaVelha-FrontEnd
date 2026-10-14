import { useEffect, useLayoutEffect, useState } from 'react'
import {
  remainingMs,
  remainingSeconds,
  type TimerDeadline,
  timerProgress,
  toServerTime,
} from '../lib/timer'
import { useClockStore } from '../stores/clockStore'

export interface ServerTimerState {
  remainingMs: number
  /** Para mostrar: 10, 9, … 1, 0 */
  remainingSeconds: number
  /** De 1 (cheio) a 0 (acabou) */
  progress: number
}

/**
 * Tempo restante de um prazo do servidor, já corrigido pela diferença de relógio.
 * Só informa: não existe "acabou o tempo" aqui, quem decide é o servidor.
 */
export function useServerTimer(
  deadline: TimerDeadline | null,
  tickMs = 100,
): ServerTimerState | null {
  const offsetMs = useClockStore((s) => s.offsetMs)
  const [clientNow, setClientNow] = useState(0)
  const startedAt = deadline?.startedAt
  const durationSeconds = deadline?.durationSeconds

  // Prazo novo: lê a hora antes de pintar, para o primeiro quadro já sair certo. É sincronização
  // com um sistema externo (o relógio), o caso em que setState no efeito é o caminho certo.
  useLayoutEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (startedAt !== undefined) setClientNow(Date.now())
  }, [startedAt, durationSeconds])

  useEffect(() => {
    if (startedAt === undefined) return
    const id = setInterval(() => setClientNow(Date.now()), tickMs)
    return () => clearInterval(id)
  }, [startedAt, durationSeconds, tickMs])

  if (!deadline) return null
  const ms = remainingMs(deadline, toServerTime(clientNow, offsetMs))
  return {
    remainingMs: ms,
    remainingSeconds: remainingSeconds(ms),
    progress: timerProgress(deadline, ms),
  }
}
