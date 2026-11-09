import { NeonTube } from '../NeonTube'
import { roundedPolygonPath, tint } from '../shapes'
import type { CharacterDesign } from './types'

const BODY = roundedPolygonPath(
  [
    [80, 30],
    [127, 114],
    [33, 114],
  ],
  9,
)

// Triângulo: sobrancelhas em V e dentes à mostra, cara de bravo; inclina como quem provoca
export const TRIANGULO_DESIGN: CharacterDesign = {
  pieceViewBox: '28 20 104 104',
  motion: 'tilt',
  shadowRx: 48,
  body: (color) => (
    <>
      <NeonTube d={BODY} color={color} width={4.5} />
      <NeonTube d="M63 77 L76 83" color={tint(color, 0.8)} width={3.2} />
      <NeonTube d="M97 77 L84 83" color={tint(color, 0.8)} width={3.2} />
      <g className="chr-blink">
        <NeonTube d="M70 91 h0.01" color={tint(color, 0.8)} width={5} />
        <NeonTube d="M90 91 h0.01" color={tint(color, 0.8)} width={5} />
      </g>
      <NeonTube d="M70 103 L75 100 L80 103 L85 100 L90 103" color={color} width={2.4} />
    </>
  ),
  // Veia de raiva no canto
  extras: (color) => (
    <g className="chr-flick">
      <NeonTube d="M117 30 Q121 33 121 28" color={color} width={2.2} />
      <NeonTube d="M127 30 Q123 33 123 28" color={color} width={2.2} />
      <NeonTube d="M117 40 Q121 37 121 42" color={color} width={2.2} />
      <NeonTube d="M127 40 Q123 37 123 42" color={color} width={2.2} />
    </g>
  ),
}
