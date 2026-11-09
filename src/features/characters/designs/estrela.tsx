import { NeonTube } from '../NeonTube'
import { roundedPolygonPath, sparklePath, starPoints, tint } from '../shapes'
import type { CharacterDesign } from './types'

const BODY = roundedPolygonPath(starPoints(80, 80, 48, 21), 5)

const SPARKLES = [
  { x: 28, y: 40, s: 7, delay: '0s' },
  { x: 134, y: 46, s: 6, delay: '0.9s' },
  { x: 130, y: 128, s: 7, delay: '1.6s' },
  { x: 30, y: 122, s: 5, delay: '0.4s' },
]

// Estrela: olhos fechados de feliz (^ ^); brilhinhos piscando em volta
export const ESTRELA_DESIGN: CharacterDesign = {
  pieceViewBox: '28 25 104 104',
  motion: 'bob',
  shadowRx: 44,
  body: (color) => (
    <>
      <NeonTube d={BODY} color={color} width={4.5} />
      <NeonTube d="M66 80 Q71 73 76 80" color={tint(color, 0.8)} width={3} />
      <NeonTube d="M84 80 Q89 73 94 80" color={tint(color, 0.8)} width={3} />
      <NeonTube d="M73 89 Q80 95 87 89" color={color} width={2.6} />
    </>
  ),
  extras: (color) => (
    <>
      {SPARKLES.map(({ x, y, s, delay }) => (
        <path
          key={`${x}-${y}`}
          className="chr-twinkle"
          style={{ animationDelay: delay }}
          d={sparklePath(x, y, s)}
          fill={tint(color, 0.4)}
        />
      ))}
    </>
  ),
}
