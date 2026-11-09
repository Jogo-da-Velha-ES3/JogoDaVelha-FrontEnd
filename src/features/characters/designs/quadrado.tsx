import { NeonTube } from '../NeonTube'
import { roundedPolygonPath, tint } from '../shapes'
import type { CharacterDesign } from './types'

const BODY = roundedPolygonPath(
  [
    [40, 38],
    [120, 38],
    [120, 118],
    [40, 118],
  ],
  12,
)

// Quadrado: olhos e boca retos, sério tipo robô; anda em "pisões"
export const QUADRADO_DESIGN: CharacterDesign = {
  pieceViewBox: '30 28 100 100',
  motion: 'stomp',
  shadowRx: 44,
  body: (color) => (
    <>
      <NeonTube d={BODY} color={color} width={4.5} />
      <g className="chr-blink">
        <NeonTube d="M58 72 H72" color={tint(color, 0.8)} width={4} />
        <NeonTube d="M88 72 H102" color={tint(color, 0.8)} width={4} />
      </g>
      <NeonTube d="M68 97 H92" color={color} width={2.6} />
    </>
  ),
  // Poeira dos pisões
  extras: (color) => (
    <g className="chr-flick">
      <NeonTube d="M24 120 h10" color={color} width={2.2} />
      <NeonTube d="M28 112 h6" color={color} width={2.2} />
      <NeonTube d="M126 120 h10" color={color} width={2.2} />
      <NeonTube d="M126 112 h6" color={color} width={2.2} />
    </g>
  ),
}
