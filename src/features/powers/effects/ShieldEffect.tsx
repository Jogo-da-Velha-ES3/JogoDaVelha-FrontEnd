import { motion } from 'framer-motion'
import { span } from './effectGeometry'
import { EffectCell, Ring, type EffectProps } from './effectParts'

// O mesmo escudo que a casa mostra enquanto ele dura (Cell)
const SHIELD = 'M12 2.5 L19.5 5.5 V11 C19.5 15.8 16.4 19.2 12 21.5 C7.6 19.2 4.5 15.8 4.5 11 V5.5 Z'

/** Escudo: o contorno acende como um tubo de neon, dá um pulso e fica o escudo da casa */
export function ShieldEffect({ target }: EffectProps) {
  if (!target) return null
  return (
    <EffectCell at={target}>
      <motion.div
        className="absolute inset-[21%]"
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: [1, 1, 1.18, 1], opacity: [1, 1, 1, 0] }}
        transition={{ ...span(0, 1), times: [0, 0.45, 0.6, 1] }}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-full overflow-visible drop-shadow-[0_0_6px_currentColor]"
        >
          <motion.path
            d={SHIELD}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={span(0, 0.45, 'easeInOut')}
          />
        </svg>
      </motion.div>
      <Ring from={20} to={58} width={2.5} transition={span(0.45, 0.85)} />
    </EffectCell>
  )
}
