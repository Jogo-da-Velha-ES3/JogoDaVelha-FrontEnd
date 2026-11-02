import { motion } from 'framer-motion'
import { offsetBetween, span } from './effectGeometry'
import { EffectCell, GhostPiece, Ring, type EffectProps } from './effectParts'

// Três arcos do redemoinho, cada um aberto para um lado
const ARCS = [
  { r: 14, turn: 0 },
  { r: 26, turn: 120 },
  { r: 38, turn: 240 },
]

/** Tornado: um redemoinho na peça do oponente, que gira e voa até a casa vizinha de destino */
export function TornadoEffect({ target, destination, piece, step }: EffectProps) {
  if (!target || !destination) return null
  const to = offsetBetween(target, destination, step)
  return (
    <>
      <EffectCell at={target}>
        <motion.div
          className="absolute inset-0"
          initial={{ rotate: 0, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 720, scale: [0.4, 1, 1.1, 0.8], opacity: [0, 1, 1, 0] }}
          transition={{ ...span(0, 0.8, 'linear'), times: [0, 0.2, 0.6, 1] }}
        >
          <svg
            viewBox="0 0 100 100"
            className="size-full overflow-visible drop-shadow-[0_0_5px_currentColor]"
          >
            {ARCS.map(({ r, turn }) => (
              <path
                key={r}
                d={`M${50 + r} 50 A${r} ${r} 0 0 1 ${50 - r} 50`}
                transform={`rotate(${turn} 50 50)`}
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
          </svg>
        </motion.div>

        {/* A peça gira no lugar e sai voando até o destino */}
        <GhostPiece
          piece={piece}
          initial={{ x: '0%', y: '0%', rotate: 0, scale: 1 }}
          animate={{
            x: ['0%', '0%', to.x],
            y: ['0%', '0%', to.y],
            rotate: [0, 270, 720],
            scale: [1, 0.85, 1],
          }}
          transition={{ ...span(0, 0.8, 'easeInOut'), times: [0, 0.3, 1] }}
        />
      </EffectCell>

      <EffectCell at={destination}>
        <Ring from={14} to={56} transition={span(0.78, 1)} />
      </EffectCell>
    </>
  )
}
