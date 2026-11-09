import { motion } from 'framer-motion'
import { AbilityIcon } from '../AbilityIcon'
import { span } from './effectGeometry'
import { EffectCell, Ring, type EffectProps } from './effectParts'

// Cristais nos quatro cantos da casa
const CORNERS = [
  'top-[-6%] left-[-6%]',
  'top-[-6%] right-[-6%]',
  'bottom-[-6%] left-[-6%]',
  'bottom-[-6%] right-[-6%]',
]

// Brilho que passa pela peça, em azul-gelo
const SHINE =
  'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-ice) 70%, transparent), transparent)'

/**
 * Congelar: anel na cor de quem usou, cristais de gelo crescendo nos cantos e um brilho passando
 * pela peça. O gelo fica em azul-gelo, a cor da peça congelada (decidido em 30/10, FE-47)
 */
export function FreezeEffect({ target }: EffectProps) {
  if (!target) return null
  return (
    <EffectCell at={target}>
      <Ring from={30} to={50} width={3} transition={span(0, 0.5)} />

      {CORNERS.map((corner, i) => (
        <motion.div
          key={corner}
          className={`absolute size-[38%] text-ice ${corner}`}
          initial={{ scale: 0, rotate: -90, opacity: 0 }}
          animate={{ scale: [0, 1, 1], rotate: [-90, 0, 0], opacity: [0, 1, 0] }}
          transition={{ ...span(0.05 + i * 0.05, 1), times: [0, 0.4, 1] }}
        >
          <AbilityIcon ability="CONGELAR" className="size-full" />
        </motion.div>
      ))}

      <div className="absolute inset-[4%] overflow-hidden rounded-md">
        <motion.div
          className="absolute inset-y-[-20%] w-[35%] rotate-[20deg]"
          style={{ background: SHINE }}
          initial={{ x: '-150%' }}
          animate={{ x: '400%' }}
          transition={span(0.35, 0.8, 'easeInOut')}
        />
      </div>
    </EffectCell>
  )
}
