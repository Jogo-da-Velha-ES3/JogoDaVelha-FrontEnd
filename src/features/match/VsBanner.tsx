import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import { useRoomStore } from '../../stores/roomStore'
import type { CharacterId } from '../../types/game'
import { Character } from '../characters'

const colorOf = (char: CharacterId | null | undefined) =>
  char ? CHARACTER_INFO[char].color : 'var(--color-line)'

/**
 * Tela de Confronto (VS) no início da partida. Layout fiel ao esboço:
 * dois painéis com clip-path diagonal, personagens frente a frente, "VS" no centro.
 * Só aparece quando phase === 'VERSUS'.
 */
export function VsBanner() {
  const phase = useRoomStore((s) => s.phase)
  const players = useRoomStore((s) => s.players)
  const mySlot = useRoomStore((s) => s.mySlot) ?? 'P1'

  const me = players.find((p) => p.slot === mySlot)
  const opp = players.find((p) => p.slot !== mySlot)

  const myColor = colorOf(me?.character)
  const oppColor = colorOf(opp?.character)

  return (
    <AnimatePresence>
      {phase === 'VERSUS' && (
        <motion.div
          role="status"
          aria-label={`Confronto: ${me?.nickname ?? 'Você'} vs ${opp?.nickname ?? 'Oponente'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          {/* Painel esquerdo (você) */}
          <div
            className="absolute inset-y-0 left-0 flex w-[55%] flex-col items-center justify-center gap-1 pb-4"
            style={
              {
                clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)',
                background: `linear-gradient(115deg, color-mix(in srgb, ${myColor} 55%, transparent), transparent 75%)`,
              } as CSSProperties
            }
          >
            {me?.character ? (
              <Character
                id={me.character}
                variant="full"
                animated
                decorative
                className="h-[55%] w-auto max-w-[45%] short:h-[48%]"
              />
            ) : (
              <span className="size-14 rounded-full border-2 border-line" />
            )}
            <p
              className="font-display text-base font-bold tracking-widest short:text-sm"
              style={{ color: myColor }}
            >
              {me?.nickname ?? 'Você'}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">VOCÊ</p>
          </div>

          {/* Painel direito (oponente) */}
          <div
            className="absolute inset-y-0 right-0 flex w-[55%] flex-col items-center justify-center gap-1 pb-4"
            style={
              {
                clipPath: 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)',
                background: `linear-gradient(295deg, color-mix(in srgb, ${oppColor} 45%, transparent), transparent 75%)`,
              } as CSSProperties
            }
          >
            {opp?.character ? (
              <Character
                id={opp.character}
                variant="full"
                animated
                decorative
                className="h-[55%] w-auto max-w-[45%] short:h-[48%]"
              />
            ) : (
              <span className="size-14 rounded-full border-2 border-line" />
            )}
            <p
              className="font-display text-base font-bold tracking-widest short:text-sm"
              style={{ color: oppColor }}
            >
              {opp?.nickname ?? 'Oponente'}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">
              OPONENTE
            </p>
          </div>

          {/* "VS" central com efeito de cor dupla */}
          <motion.p
            aria-hidden="true"
            initial={{ scale: 2.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 380, damping: 22 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-6xl font-extrabold text-primary short:text-5xl"
            style={{
              textShadow: `3px 0 ${myColor}, -3px 0 ${oppColor}, 0 0 24px var(--color-primary)`,
            }}
          >
            VS
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
