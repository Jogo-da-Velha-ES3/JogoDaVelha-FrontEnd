import { AnimatePresence, motion } from 'framer-motion'
import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import { ABILITY_NOTICE_SECONDS } from '../../constants/game'
import { useIsBefore } from '../../hooks/useIsBefore'
import { useBoardStore } from '../../stores/boardStore'
import { useRoomStore } from '../../stores/roomStore'
import { AbilityIcon } from './AbilityIcon'
import { abilityImpactSide } from './abilityImpactSide'

/**
 * Aviso da habilidade que o servidor resolveu (FE-27), na coluna direita da Arena, sem cobrir o
 * tabuleiro. O deck do oponente é oculto, então toda habilidade dele é anunciada; as minhas só
 * quando foram anuladas pelo Campo de Força ou ficaram sem efeito. Some depois de
 * ABILITY_NOTICE_SECONDS; quem reconecta não vê o aviso de novo (o snapshot não traz habilidade).
 */
export function AbilityNotice() {
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const players = useRoomStore((s) => s.players)
  const result = useBoardStore((s) => s.lastAbility)
  const visible = useIsBefore(result ? result.receivedAt + ABILITY_NOTICE_SECONDS * 1000 : null)

  const show = result !== null && (result.by !== me || result.absorbed || result.noEffect)
  const used =
    result && `${result.by === me ? 'Você' : 'Oponente'} usou ${ABILITY_INFO[result.ability].name}`
  const side = result && abilityImpactSide(result)
  const character = side && players.find((p) => p.slot === side)?.character
  const color = character ? CHARACTER_INFO[character].color : 'var(--color-text-muted)'

  return (
    <AnimatePresence>
      {show && visible && (
        <motion.div
          key={result.receivedAt}
          role="status"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="pointer-events-none flex items-center gap-2 rounded-xl border bg-bg-panel px-2.5 py-1.5 shadow-glow"
          style={{ borderColor: color, color }}
        >
          <AbilityIcon ability={result.ability} className="size-6 shrink-0 short:size-5" />
          <div className="min-w-0">
            {result.absorbed || result.noEffect ? (
              <>
                <p className="font-display text-sm leading-tight font-bold uppercase short:text-xs">
                  {result.absorbed ? 'Anulada pelo Campo de Força!' : 'Sem efeito!'}
                </p>
                <p className="font-body text-xs text-text-muted">{used}</p>
              </>
            ) : (
              <p className="font-display text-sm leading-tight font-bold uppercase short:text-xs">
                {used}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
