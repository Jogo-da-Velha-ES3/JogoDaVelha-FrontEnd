import { useEffect, useState } from 'react'
import { ABILITY_IMPACT_SECONDS } from '../../constants/game'
import { useIsBefore } from '../../hooks/useIsBefore'
import type { AbilityId } from '../../types/game'
import { Board } from '../board'
import { abilityDemo } from '../powers/effects/abilityDemo'

/** Efeito e uma pausa curta antes de recomeçar, como o "Repetir" da vitrine */
export const SKILL_DEMO_LOOP_MS = ABILITY_IMPACT_SECONDS * 1000 + 800

/**
 * Demonstração em loop da habilidade num mini-tabuleiro (FE-31) [RF-LOJ-01], no padrão da vitrine
 * (`AbilityEffectShowcase`): o tabuleiro de exemplo de `abilityDemo` (FE-47) e a animação da
 * habilidade por cima, recomeçando sozinha. Você é o X; o oponente, o O.
 */
export function SkillDemo({ ability, label }: { ability: AbilityId; label: string }) {
  const [startedAt, setStartedAt] = useState(Date.now)
  const demo = abilityDemo(ability, 'P1')
  // Depois da animação, o tabuleiro fica parado no estado final até a próxima volta
  const playing = useIsBefore(startedAt + ABILITY_IMPACT_SECONDS * 1000)

  useEffect(() => {
    const id = setInterval(() => setStartedAt(Date.now()), SKILL_DEMO_LOOP_MS)
    return () => clearInterval(id)
  }, [ability])

  return (
    <figure aria-label={label} className="size-40 shrink-0 short:size-32">
      <Board
        cells={demo.cells}
        characters={{ P1: 'X', P2: 'O' }}
        impact={playing ? { ...demo.result, serverTime: startedAt, receivedAt: startedAt } : null}
        disabled
      />
    </figure>
  )
}
