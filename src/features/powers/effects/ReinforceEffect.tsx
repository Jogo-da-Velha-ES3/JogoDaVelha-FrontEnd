import { motion } from 'framer-motion'
import { span } from './effectGeometry'
import { EffectCell, type EffectProps } from './effectParts'

// Raio do anel que a casa mostra enquanto o Reforço dura (inset de 8% na Cell)
const RING = 42

/** Reforço: dois anéis fecham em volta da peça, dão um clique de brilho e fica o anel da casa */
export function ReinforceEffect({ target }: EffectProps) {
  if (!target) return null
  return (
    <EffectCell at={target}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full overflow-visible drop-shadow-[0_0_5px_currentColor]"
      >
        {[0, 0.12].map((delay) => (
          <motion.circle
            key={delay}
            cx={50}
            cy={50}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            initial={{ r: 74, opacity: 0 }}
            animate={{ r: [74, RING, RING], opacity: [0, 1, 0] }}
            transition={{ ...span(delay, 0.75 + delay, 'easeIn'), times: [0, 0.5, 1] }}
          />
        ))}
        {/* O clique: o anel engrossa e brilha quando os dois se encontram */}
        <motion.circle
          cx={50}
          cy={50}
          r={RING}
          fill="none"
          stroke="currentColor"
          initial={{ strokeWidth: 3, opacity: 0 }}
          animate={{ strokeWidth: [3, 9, 3], opacity: [0, 1, 0] }}
          transition={span(0.42, 0.95)}
        />
      </svg>
    </EffectCell>
  )
}
