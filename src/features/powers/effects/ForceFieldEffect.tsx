import { motion } from 'framer-motion'
import { hexagonPath } from '../abilityIconDesigns'
import { span } from './effectGeometry'
import { EffectCell } from './effectParts'

// Três hexágonos, do centro para fora
const HEXAGONS = [16, 30, 44]

/** Campo de Força: hexágonos se abrem do centro até a borda do tabuleiro, como uma bolha */
export function ForceFieldEffect() {
  return (
    <EffectCell at="board">
      <motion.div
        className="absolute inset-[3%]"
        initial={{ scale: 0.5, opacity: 1 }}
        animate={{ scale: 1, opacity: [1, 1, 0] }}
        transition={{
          scale: span(0, 0.45, 'backOut'),
          opacity: { ...span(0, 1), times: [0, 0.6, 1] },
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="size-full overflow-visible drop-shadow-[0_0_6px_currentColor]"
        >
          {HEXAGONS.map((r, i) => (
            <motion.path
              key={r}
              d={hexagonPath(50, 50, r)}
              fill="currentColor"
              fillOpacity={0.05}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={span(i * 0.08, 0.35 + i * 0.08, 'easeInOut')}
            />
          ))}
        </svg>
      </motion.div>
    </EffectCell>
  )
}
