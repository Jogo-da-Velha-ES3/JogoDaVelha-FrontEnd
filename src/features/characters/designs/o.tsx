import { NeonDot, NeonTube } from '../NeonTube'
import { circlePath } from '../shapes'
import type { CharacterDesign } from './types'

// O: visor que varre de um lado para o outro; anel tracejado girando (Estilo A)
export const O_DESIGN: CharacterDesign = {
  pieceViewBox: '35 33 90 90',
  motion: 'bob',
  shadowRx: 40,
  body: (color) => (
    <>
      <NeonTube d={circlePath(80, 78, 40)} color={color} width={4.5} />
      <NeonTube d={circlePath(80, 78, 28)} color={color} width={2} opacity={0.55} />
      <NeonTube d="M63 78 H97" color={color} width={5} />
      <NeonDot className="chr-scan" cx={80} cy={78} r={3.2} />
    </>
  ),
  extras: (color) => (
    <circle
      className="chr-spin"
      cx="80"
      cy="78"
      r="51"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeDasharray="4 8"
      opacity="0.6"
    />
  ),
}
