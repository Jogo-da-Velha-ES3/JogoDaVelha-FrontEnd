import { motion } from 'framer-motion'
import { AbilityIcon } from '../AbilityIcon'
import { span } from './effectGeometry'
import { EffectCell } from './effectParts'

// Ondas de som dos dois lados do balão (o lado esquerdo é espelhado)
const WAVES = [8, 16, 24]

function Waves({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 40 100"
      className={`absolute top-0 h-full w-[45%] overflow-visible drop-shadow-[0_0_4px_currentColor] ${side === 'right' ? 'left-full' : 'right-full -scale-x-100'}`}
    >
      {WAVES.map((x, i) => (
        <motion.path
          key={x}
          d={`M${x} 30 Q${x + 10} 50 ${x} 70`}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          // Cortadas de uma vez no meio do efeito, como se tirassem o som
          animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
          transition={{ ...span(0.12 + i * 0.07, 0.48), times: [0, 0.6, 1] }}
        />
      ))}
    </svg>
  )
}

/** Silêncio: o balão aparece no centro com ondas de som, que são cortadas, e o balão treme */
export function SilenceEffect() {
  return (
    <EffectCell at="board" className="grid place-items-center">
      <motion.div
        className="relative aspect-square w-[30%]"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.1, 1], opacity: [0, 1, 1, 0] }}
        transition={{
          scale: span(0, 0.3, 'backOut'),
          opacity: { ...span(0, 1), times: [0, 0.12, 0.8, 1] },
        }}
      >
        <Waves side="left" />
        <Waves side="right" />
        <motion.div
          className="grid size-full place-items-center rounded-full border-2 border-current bg-bg-deep/85 shadow-[0_0_18px_currentColor]"
          initial={{ x: '0%' }}
          animate={{ x: ['0%', '-6%', '6%', '-4%', '0%'] }}
          transition={span(0.48, 0.68)}
        >
          <AbilityIcon ability="SILENCIO" className="size-[60%]" />
        </motion.div>
      </motion.div>
    </EffectCell>
  )
}
