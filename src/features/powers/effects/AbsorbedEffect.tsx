import { motion } from 'framer-motion'
import { AbilityIcon } from '../AbilityIcon'
import { hexagonPath } from '../abilityIconDesigns'
import { span } from './effectGeometry'
import { EffectCell, type EffectProps } from './effectParts'

// Os quatro pedaços do ícone e para onde cada um voa
const PIECES = [
  { clip: 'inset(0 50% 50% 0)', x: '-45%', y: '-40%', rotate: -40 },
  { clip: 'inset(0 0 50% 50%)', x: '45%', y: '-40%', rotate: 40 },
  { clip: 'inset(50% 50% 0 0)', x: '-45%', y: '45%', rotate: -30 },
  { clip: 'inset(50% 0 0 50%)', x: '45%', y: '45%', rotate: 30 },
]

/**
 * Anulada pelo Campo de Força [RN-ARN-04]: a habilidade, na cor de quem usou, bate no hexágono de
 * quem defendeu (a cor do efeito) e se estilhaça. Na casa do alvo ou, sem casa, no centro
 */
export function AbsorbedEffect({ result, target, userColor }: EffectProps) {
  return (
    <EffectCell at={target ?? 'board'}>
      <div className={`absolute ${target ? 'inset-0' : 'inset-[30%]'}`}>
        <motion.div
          className="absolute inset-[4%]"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1, 1.12, 1], opacity: [0, 1, 1, 0] }}
          transition={{ ...span(0, 1), times: [0, 0.2, 0.4, 1] }}
        >
          <svg
            viewBox="0 0 48 48"
            className="size-full overflow-visible drop-shadow-[0_0_6px_currentColor]"
          >
            <path
              d={hexagonPath(24, 24, 21)}
              fill="currentColor"
              fillOpacity={0.08}
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {PIECES.map((piece) => (
          <motion.div
            key={piece.clip}
            className="absolute inset-[24%]"
            style={{ color: userColor, clipPath: piece.clip }}
            initial={{ x: '0%', y: '-120%', opacity: 0 }}
            animate={{
              x: ['0%', '0%', '0%', piece.x],
              y: ['-120%', '0%', '0%', piece.y],
              rotate: [0, 0, 0, piece.rotate],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ ...span(0, 0.8), times: [0, 0.35, 0.42, 1] }}
          >
            <AbilityIcon ability={result.ability} className="size-full" />
          </motion.div>
        ))}
      </div>
    </EffectCell>
  )
}
