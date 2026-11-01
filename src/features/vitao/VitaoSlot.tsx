import { VITAO_ENABLED } from '../../constants/game'
import type { VitaoExpression } from '../../lib/vitao'
import { useMatchStore } from '../../stores/matchStore'
import bravo from './assets/vitao-bravo.webp'
import debochado from './assets/vitao-debochado.webp'
import diabo from './assets/vitao-diabo.webp'
import dormindo from './assets/vitao-dormindo.webp'
import muitoBravo from './assets/vitao-muito-bravo.webp'
import normal from './assets/vitao-normal.webp'
import rindo from './assets/vitao-rindo.webp'
import surpreso from './assets/vitao-surpreso.webp'
import { useVitaoReactions } from './useVitaoReactions'

const IMAGES: Record<VitaoExpression, string> = {
  NORMAL: normal,
  RINDO: rindo,
  DEBOCHADO: debochado,
  BRAVO: bravo,
  MUITO_BRAVO: muitoBravo,
  SURPRESO: surpreso,
  DORMINDO: dormindo,
  DIABO: diabo,
}

/** Versão provisória até a FE-42 (bonequinho animado): cabeça da expressão + balão */
function VitaoPresence() {
  const reaction = useVitaoReactions()
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  // Na Morte Súbita ele é o Diabo o tempo todo, não só quando fala
  const expression = reaction?.expression ?? (suddenDeath ? 'DIABO' : 'NORMAL')

  return (
    <div className="flex min-h-0 items-center gap-2">
      <img
        src={IMAGES[expression]}
        alt="Vitão"
        className="size-12 shrink-0 rounded-full object-cover short:size-10"
      />
      {reaction && (
        <p
          role="status"
          className={`line-clamp-3 min-w-0 rounded-lg border bg-black/40 px-2 py-1 font-body text-xs leading-snug ${reaction.devil ? 'border-danger text-danger' : 'border-line'}`}
        >
          {reaction.text}
        </p>
      )}
    </div>
  )
}

/**
 * Espaço do Vitão na coluna esquerda da Arena, entre os dois jogadores. Com a flag desligada, o
 * espaço existe, mas nada aparece (PROJECT_CONTEXT §9).
 */
export function VitaoSlot() {
  return (
    <div data-region="vitao" aria-hidden={!VITAO_ENABLED} className="min-h-0 flex-1">
      {VITAO_ENABLED && <VitaoPresence />}
    </div>
  )
}
