import { useEffect, useState } from 'react'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'

/**
 * Resultados cuja apresentação ao vivo (comemoração, Coins) já tocou. A chave identifica a
 * partida: sala, início do último round, resultado e Coins. Sobrevive a uma remontagem da tela
 * (ex: um MATCH_END repetido que reabre a espera da Arena), mas uma revanche ganha ROUND_START
 * novo e, portanto, chave nova.
 */
const PLAYED = new Set<string>()

/** Só para os testes: esquece o que já tocou */
export function resetLiveResultMemory() {
  PLAYED.clear()
}

/** null enquanto o servidor não mandou o resultado */
function useResultKey(): string | null {
  const code = useRoomStore((s) => s.code)
  const roundStartedAt = useMatchStore((s) => s.roundStartedAt)
  const outcome = useMatchStore((s) => s.outcome)
  const coins = useMatchStore((s) => s.coins)
  if (outcome === null) return null
  return `${code}|${roundStartedAt}|${JSON.stringify(outcome)}|${JSON.stringify(coins)}`
}

/**
 * O resultado acabou de chegar, ao vivo? É o único ponto que decide se a tela do Resultado toca
 * as animações de entrada (comemoração e Coins): chame uma vez e passe o valor para baixo.
 *
 * - Decidido uma vez só, quando o resultado aparece na tela, e congelado. Quem reconecta (o
 *   snapshot deixa `outcomeReceivedAt` nulo) vê o estado final, sem replay.
 * - Um MATCH_END repetido muda `outcomeReceivedAt`, mas a decisão já está tomada: não reinicia.
 * - Se a tela for desmontada e montada de novo para o mesmo resultado, também não repete.
 */
export function useLiveResult(): boolean {
  const key = useResultKey()
  const receivedAt = useMatchStore((s) => s.outcomeReceivedAt)
  const [decision, setDecision] = useState<{ key: string; live: boolean } | null>(null)

  // Ajuste de estado durante a renderização: decide na primeira vez que há resultado
  if (decision === null && key !== null) {
    setDecision({ key, live: receivedAt !== null && !PLAYED.has(key) })
  }

  useEffect(() => {
    if (decision?.live) PLAYED.add(decision.key)
  }, [decision])

  return decision?.live ?? false
}
