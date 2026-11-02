import { motion } from 'framer-motion'
import { AbilityIcon } from '../AbilityIcon'
import { span } from './effectGeometry'
import { EffectCell, GhostPiece, Ring, type EffectProps } from './effectParts'

// Fagulhas: 8 raios saindo do centro da casa
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI / 4) * i + Math.PI / 8
  const at = (r: number) =>
    `${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`
  return `M${at(18)} L${at(58)}`
})

/** Bomba: cai na casa, a peça treme, clarão com onda de choque e a peça vira fagulhas */
export function BombEffect({ target, piece }: EffectProps) {
  if (!target) return null
  return (
    <EffectCell at={target}>
      {/* A peça removida (o tabuleiro já chega sem ela) */}
      <GhostPiece
        piece={piece}
        initial={{ opacity: 1 }}
        animate={{
          x: ['0%', '-4%', '4%', '-4%', '0%', '0%'],
          scale: [1, 1, 1, 1, 1.2, 0.3],
          opacity: [1, 1, 1, 1, 0.9, 0],
        }}
        transition={{ ...span(0, 0.6), times: [0, 0.15, 0.3, 0.45, 0.55, 1] }}
      />

      <motion.div
        className="absolute inset-[20%]"
        initial={{ y: '-90%', opacity: 0 }}
        animate={{ y: ['-90%', '0%', '0%', '0%'], opacity: [0, 1, 1, 0] }}
        transition={{ ...span(0, 0.36, 'easeIn'), times: [0, 0.55, 0.9, 1] }}
      >
        <AbilityIcon ability="BOMBA" className="size-full" />
      </motion.div>

      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full overflow-visible drop-shadow-[0_0_6px_currentColor]"
      >
        {/* Clarão */}
        <motion.circle
          cx={50}
          cy={50}
          fill="currentColor"
          initial={{ r: 6, opacity: 0 }}
          animate={{ r: [6, 36], opacity: [0.9, 0] }}
          transition={span(0.34, 0.62)}
        />
        {SPARKS.map((d) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0.35, pathOffset: 0, opacity: 0 }}
            animate={{ pathOffset: [0, 0.65], opacity: [1, 0] }}
            transition={span(0.34, 0.8)}
          />
        ))}
      </svg>
      <Ring from={14} to={64} width={4} transition={span(0.34, 0.85)} />
    </EffectCell>
  )
}
