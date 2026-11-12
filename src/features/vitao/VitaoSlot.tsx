import { useEffect } from 'react'
import { VITAO_ENABLED } from '../../constants/game'
import { useLanguageFilter } from '../../hooks/useLanguageFilter'
import { useMatchStore } from '../../stores/matchStore'
import { playVoice, preloadVoices } from '../sound/soundManager'
import { voicesFor } from './vitaoVoices'
import { useSettingsStore } from '../../stores/settingsStore'
import { useVitaoReactions } from './useVitaoReactions'
import { VitaoView } from './VitaoView'

/** Liga o motor de reações (FE-44) ao Vitão desenhado (FE-42) e à voz do Rafik (FE-48) */
function VitaoPresence() {
  const reaction = useVitaoReactions()
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const filterOn = useLanguageFilter()

  // Baixa as falas ao entrar na Arena, para a voz sair junto com o balão
  useEffect(() => {
    preloadVoices(voicesFor(filterOn))
  }, [filterOn])

  // Fala nova com gravação: a voz toca junto com o balão e corta a que estiver tocando
  const reactionId = reaction?.id
  const audio = reaction?.audio
  useEffect(() => {
    if (reactionId !== undefined && audio) playVoice(audio)
  }, [reactionId, audio])
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
