// Tempo restante calculado a partir do timestamp do servidor [RF-ARN-02]. O front só desenha:
// timeout, turno perdido e W.O. são decididos pelo servidor [RN-ARN-03].

/** Prazo como o servidor manda: quando começou (relógio do servidor, ms) e quanto dura */
export interface TimerDeadline {
  startedAt: number
  durationSeconds: number
}

/**
 * Diferença entre o relógio do servidor e o do aparelho (servidor − aparelho), medida quando uma
 * mensagem chega. A latência faz a medida sair um pouco menor que a real.
 */
export function estimateClockOffset(serverTime: number, receivedAt: number): number {
  return serverTime - receivedAt
}

/** Hora do servidor, estimada a partir do relógio do aparelho */
export function toServerTime(clientNow: number, offsetMs: number): number {
  return clientNow + offsetMs
}

/** Milissegundos restantes, sempre entre 0 e a duração (relógio adiantado ou atrasado) */
export function remainingMs(deadline: TimerDeadline, serverNow: number): number {
  const durationMs = deadline.durationSeconds * 1000
  const left = deadline.startedAt + durationMs - serverNow
  return Math.min(Math.max(left, 0), durationMs)
}

/** Segundos para mostrar: arredonda para cima, então conta 10, 9, … 1 e só mostra 0 no fim */
export function remainingSeconds(ms: number): number {
  return Math.ceil(ms / 1000)
}

/** Fração restante, de 1 (cheio) a 0 (acabou), para a barra */
export function timerProgress(deadline: TimerDeadline, ms: number): number {
  const durationMs = deadline.durationSeconds * 1000
  return durationMs > 0 ? ms / durationMs : 0
}
