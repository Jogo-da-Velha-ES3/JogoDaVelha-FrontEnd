import { VITAO_ENABLED } from '../../constants/game'
import { useMatchStore } from '../../stores/matchStore'
import { useSettingsStore } from '../../stores/settingsStore'
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
 * Espaço do Vitão na coluna esquerda da Arena, entre os dois jogadores. Com a flag desligada, ou
 * com o Vitão desligado nas Configurações (FE-39), o espaço existe, mas nada aparece
 * (PROJECT_CONTEXT §9).
 */
export function VitaoSlot() {
  const vitaoOn = useSettingsStore((s) => s.vitaoOn)
  const visible = VITAO_ENABLED && vitaoOn

  return (
    <div data-region="vitao" aria-hidden={!visible} className="min-h-0 flex-1 select-none">
      {visible && <VitaoPresence />}
    </div>
  )
}
