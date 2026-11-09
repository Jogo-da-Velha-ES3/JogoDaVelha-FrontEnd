import { motion } from 'framer-motion'
import { AbilityIcon } from '../AbilityIcon'
import { span } from './effectGeometry'
import { EffectCell, type EffectProps } from './effectParts'

// Três baforadas de fumaça subindo
const PUFFS = [
  { x: '-70%', delay: 0 },
  { x: '0%', delay: 0.06 },
  { x: '70%', delay: 0.12 },
]

/**
 * Sem efeito [RN-ARN-05]: o ícone aparece numa borda tracejada, solta fumaça e apaga, em cor
 * neutra. Na casa do alvo ou, sem casa, no centro
 */
export function NoEffectEffect({ result, target }: EffectProps) {
  return (
    <EffectCell at={target ?? 'board'}>
      <div className={`absolute ${target ? 'inset-0' : 'inset-[32%]'}`}>
        <motion.div
          className="absolute inset-[14%] grid place-items-center rounded-full border-2 border-dashed border-current bg-bg-deep/80"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1, 1, 0.9], opacity: [0, 1, 1, 0], y: ['0%', '0%', '0%', '8%'] }}
          transition={{ ...span(0, 1), times: [0, 0.2, 0.5, 1] }}
        >
          <AbilityIcon ability={result.ability} className="size-[60%]" />
        </motion.div>

        {PUFFS.map((puff) => (
          <motion.span
            key={puff.x}
            className="absolute top-[30%] left-[42%] size-[16%] rounded-full bg-current"
            initial={{ x: puff.x, y: '0%', scale: 0.6, opacity: 0 }}
            animate={{ y: '-220%', scale: 1.5, opacity: [0, 0.5, 0] }}
            transition={span(0.4 + puff.delay, 0.9 + puff.delay)}
          />
        ))}
      </div>
    </EffectCell>
  )
}
