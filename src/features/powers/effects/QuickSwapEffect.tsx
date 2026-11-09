import { motion } from 'framer-motion'
import { AbilityIcon } from '../AbilityIcon'
import { offsetBetween, span } from './effectGeometry'
import { EffectCell, GhostPiece, Ring, type EffectProps } from './effectParts'

// Rastro: cópias cada vez mais apagadas, saindo um pouco depois da peça
const TRAIL = [0.35, 0.2, 0.1]

/** Troca Rápida: a peça própria desliza rápido para a casa vizinha, deixando rastro */
export function QuickSwapEffect({ target, destination, piece, step }: EffectProps) {
  if (!target || !destination) return null
  const to = offsetBetween(target, destination, step)
  const slide = (delay: number) => span(0.1 + delay, 0.45 + delay, 'backOut')

  return (
    <>
      <EffectCell at={target}>
        <motion.div
          className="absolute -top-[10%] -right-[10%] size-[42%]"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1, 1], opacity: [0, 1, 0] }}
          transition={span(0, 0.35)}
        >
          <AbilityIcon ability="TROCA_RAPIDA" className="size-full" />
        </motion.div>

        {TRAIL.map((opacity, i) => (
          <GhostPiece
            key={opacity}
            piece={piece}
            initial={{ x: '0%', y: '0%', opacity: 0 }}
            animate={{ x: to.x, y: to.y, opacity: [0, opacity, 0] }}
            transition={{
              x: slide((i + 1) * 0.05),
              y: slide((i + 1) * 0.05),
              opacity: { ...span(0.1, 0.6 + i * 0.05), times: [0, 0.3, 1] },
            }}
          />
        ))}
        <GhostPiece
          piece={piece}
          initial={{ x: '0%', y: '0%' }}
          animate={{ x: to.x, y: to.y }}
          transition={slide(0)}
        />
      </EffectCell>

      <EffectCell at={destination}>
        <Ring from={20} to={56} transition={span(0.45, 0.8)} />
      </EffectCell>
    </>
  )
}
