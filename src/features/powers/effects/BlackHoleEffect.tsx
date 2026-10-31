import { motion } from 'framer-motion'
import { span } from './effectGeometry'
import { EffectCell, GhostPiece, Ring, type EffectProps } from './effectParts'

/**
 * Buraco Negro: um disco escuro abre na peça do oponente e a suga girando; ela reaparece na casa
 * sorteada pelo servidor, com um anel se abrindo
 */
export function BlackHoleEffect({ target, destination, piece }: EffectProps) {
  if (!target || !destination) return null
  return (
    <>
      <EffectCell at={target}>
        <motion.div
          className="absolute inset-[6%] rounded-full border-2 border-current bg-bg-deep shadow-[0_0_16px_currentColor,inset_0_0_14px_currentColor]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{ ...span(0, 0.65), times: [0, 0.25, 0.8, 1] }}
        />
        {/* Disco de acreção girando ao contrário da peça */}
        <motion.div
          className="absolute inset-0"
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: -540, opacity: [0, 1, 1, 0] }}
          transition={{ ...span(0, 0.65, 'linear'), times: [0, 0.2, 0.8, 1] }}
        >
          <svg viewBox="0 0 100 100" className="size-full overflow-visible">
            <circle
              cx={50}
              cy={50}
              r={40}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="10 8"
            />
          </svg>
        </motion.div>
        <GhostPiece
          piece={piece}
          initial={{ scale: 1, rotate: 0, opacity: 1 }}
          animate={{ scale: [1, 1, 0], rotate: [0, 90, 540], opacity: [1, 1, 0] }}
          transition={{ ...span(0.1, 0.55, 'easeIn'), times: [0, 0.2, 1] }}
        />
      </EffectCell>

      <EffectCell at={destination}>
        <Ring from={6} to={58} transition={span(0.55, 0.95)} />
        <GhostPiece
          piece={piece}
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: [0, 1.15, 1], rotate: [-180, 0, 0], opacity: [0, 1, 1] }}
          transition={{ ...span(0.6, 0.9), times: [0, 0.7, 1] }}
        />
      </EffectCell>
    </>
  )
}
