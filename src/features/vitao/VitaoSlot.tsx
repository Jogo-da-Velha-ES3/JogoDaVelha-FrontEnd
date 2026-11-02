import { VITAO_ENABLED } from '../../constants/game'
import { useMatchStore } from '../../stores/matchStore'
import { useVitaoReactions } from './useVitaoReactions'
import { VitaoView } from './VitaoView'

/** Liga o motor de reações (FE-44) ao Vitão desenhado (FE-42) */
function VitaoPresence() {
  const reaction = useVitaoReactions()
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  // Na Morte Súbita ele é o Diabo o tempo todo, não só quando fala
  const expression = reaction?.expression ?? (suddenDeath ? 'DIABO' : 'NORMAL')

  return (
    <VitaoView
      expression={expression}
      text={reaction?.text}
      devil={reaction?.devil}
      reactionId={reaction?.id}
    />
  )
}

/**
 * Espaço do Vitão na coluna esquerda da Arena, entre os dois jogadores. Com a flag desligada, o
 * espaço existe, mas nada aparece (PROJECT_CONTEXT §9).
 */
export function VitaoSlot() {
  return (
    <div data-region="vitao" aria-hidden={!VITAO_ENABLED} className="min-h-0 flex-1 select-none">
      {VITAO_ENABLED && <VitaoPresence />}
    </div>
  )
}
