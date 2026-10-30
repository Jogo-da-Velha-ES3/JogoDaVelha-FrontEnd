import { motion } from 'framer-motion'
import { HOURGLASS_TURN_DURATION_SECONDS } from '../../../constants/game'
import { AbilityIcon } from '../AbilityIcon'
import { span } from './effectGeometry'
import { EffectCell } from './effectParts'

/** Ampulheta: no centro do tabuleiro, a ampulheta vira e aparece o tempo do próximo turno do oponente */
export function HourglassEffect() {
  return (
    <EffectCell at="board" className="grid place-items-center">
      <motion.div
        className="relative grid aspect-square w-[38%] place-items-center rounded-full border-2 border-current bg-bg-deep/85 shadow-[0_0_22px_currentColor]"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.08, 1], opacity: [0, 1, 1, 0] }}
        transition={{
          scale: span(0, 0.25, 'backOut'),
          opacity: { ...span(0, 1), times: [0, 0.12, 0.8, 1] },
        }}
      >
        <motion.div
          className="w-[50%] -translate-y-[12%]"
          initial={{ rotate: 0 }}
          animate={{ rotate: 180 }}
          transition={span(0.15, 0.5, 'easeInOut')}
        >
          <AbilityIcon ability="AMPULHETA" className="size-full" />
        </motion.div>
        <motion.span
          className="absolute bottom-[10%] font-display text-[7cqmin] leading-none font-extrabold"
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={span(0.5, 0.65)}
        >
          {HOURGLASS_TURN_DURATION_SECONDS}s
        </motion.span>
      </motion.div>
    </EffectCell>
  )
}
