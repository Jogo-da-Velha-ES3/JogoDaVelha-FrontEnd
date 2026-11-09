import { NeonTube } from '../NeonTube'
import { tint, xRoundPath } from '../shapes'
import type { CharacterDesign } from './types'

// X: olhar de canto e sorriso torto; faíscas em volta (página de estilos, Estilo A)
export const X_DESIGN: CharacterDesign = {
  pieceViewBox: '28 26 104 104',
  motion: 'bob',
  shadowRx: 46,
  body: (color) => (
    <>
      <NeonTube d={xRoundPath(11, 46, 80, 78, 45)} color={color} width={4.5} />
      <g className="chr-blink">
        <NeonTube d="M65 71 L76 77" color={tint(color, 0.8)} width={3.2} />
        <NeonTube d="M95 71 L84 77" color={tint(color, 0.8)} width={3.2} />
      </g>
      <NeonTube d="M72 90 Q80 93 89 86" color={color} width={2.6} />
    </>
  ),
  extras: (color) => (
    <g className="chr-flick">
      <NeonTube d="M24 30 l7 6 -5 3 8 7" color={color} width={2.2} />
      <NeonTube d="M136 30 l-7 6 5 3 -8 7" color={color} width={2.2} />
    </g>
  ),
}
