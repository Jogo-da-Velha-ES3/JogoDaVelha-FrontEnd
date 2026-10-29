import { useEffect, useRef, useState } from 'react'
import { VITAO_BUBBLE_SECONDS, VITAO_DECISION_WINDOW_MS } from '../../constants/game'
import { decideVitaoReaction, type VitaoMoment, type VitaoReaction } from '../../lib/vitao'
import { VITAO_LINES } from '../../lib/vitaoLines'
import { momentsFromChange, type VitaoSnapshot } from '../../lib/vitaoMoments'
import { useBoardStore } from '../../stores/boardStore'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'

export interface ShownReaction extends VitaoReaction {
  /** Muda a cada fala nova, mesmo com o mesmo texto */
  id: number
}

/**
 * Lê o filtro de linguagem das Configurações.
 * TODO FE-39: ler do modal de Configurações (localStorage ou store de configurações).
 * Por enquanto, desligado: "sem filtro por padrão" (PROJECT_CONTEXT §9).
 */
function useVitaoFilterPreference(): boolean {
  return false
}

function readSnapshot(): VitaoSnapshot {
  const board = useBoardStore.getState()
  const match = useMatchStore.getState()
  return {
    cells: board.cells,
    lastAbility: board.lastAbility,
    lastTimeout: match.lastTimeout,
    roundEnd: match.roundEnd,
    outcome: match.outcome,
    outcomeReceivedAt: match.outcomeReceivedAt,
    introStartedAt: match.introStartedAt,
    roundStartedAt: match.roundStartedAt,
    suddenDeath: match.suddenDeath,
  }
}

/**
 * Motor de reações do Vitão (FE-44): observa as stores do jogo, que só mudam por evento confirmado
 * pelo servidor, junta o que chegou numa janela curta, decide a reação pelas regras puras de
 * src/lib/vitao.ts (1 fala a cada 6s, momentos grandes primeiro, "Diabo" na Morte Súbita) e devolve
 * a fala atual, que some sozinha depois de alguns segundos.
 */
export function useVitaoReactions(): ShownReaction | null {
  const [reaction, setReaction] = useState<ShownReaction | null>(null)
  const filterOn = useVitaoFilterPreference()
  const filterRef = useRef(filterOn)
  const lastSpeechAt = useRef<number | null>(null)
  const nextId = useRef(1)

  useEffect(() => {
    filterRef.current = filterOn
  }, [filterOn])

  useEffect(() => {
    let prev = readSnapshot()
    let pending: VitaoMoment[] = []
    let timer: ReturnType<typeof setTimeout> | null = null

    const decide = () => {
      timer = null
      const moments = pending
      pending = []

      const now = Date.now()
      const decision = decideVitaoReaction(
        moments,
        {
          now,
          lastSpeechAt: lastSpeechAt.current,
          suddenDeath: useMatchStore.getState().suddenDeath,
          filterOn: filterRef.current,
        },
        VITAO_LINES,
      )
      if (!decision) return

      lastSpeechAt.current = now
      setReaction({ ...decision, id: nextId.current++ })
    }

    const onChange = () => {
      const next = readSnapshot()
      const me = useRoomStore.getState().mySlot ?? 'P1'
      const moments = momentsFromChange(prev, next, me)
      prev = next
      if (moments.length === 0) return

      pending.push(...moments)
      // O que chega junto (ex: a última jogada e o fim do round) é decidido de uma vez
      if (timer === null) timer = setTimeout(decide, VITAO_DECISION_WINDOW_MS)
    }

    const unsubscribers = [useBoardStore.subscribe(onChange), useMatchStore.subscribe(onChange)]
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
      if (timer !== null) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!reaction) return
    const timeout = setTimeout(() => setReaction(null), VITAO_BUBBLE_SECONDS * 1000)
    return () => clearTimeout(timeout)
  }, [reaction])

  return reaction
}
