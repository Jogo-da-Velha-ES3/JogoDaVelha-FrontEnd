import { NeonTube } from '../NeonTube'
import { HEART_PATH, heartPath, tint } from '../shapes'
import type { CharacterDesign } from './types'

// Coração: olhos grandes e bochechas; pulsa como batimento
export const CORACAO_DESIGN: CharacterDesign = {
  pieceViewBox: '30 27 100 100',
  motion: 'beat',
  shadowRx: 44,
  body: (color) => (
    <>
      <NeonTube d={HEART_PATH} color={color} width={4.5} />
      <g className="chr-blink">
        <NeonTube d="M67 70 h0.01" color={tint(color, 0.8)} width={8} />
        <NeonTube d="M93 70 h0.01" color={tint(color, 0.8)} width={8} />
      </g>
      <NeonTube d="M54 83 h7" color={color} width={2.4} opacity={0.6} />
      <NeonTube d="M99 83 h7" color={color} width={2.4} opacity={0.6} />
      <NeonTube d="M74 86 Q80 92 86 86" color={tint(color, 0.8)} width={2.4} />
    </>
  ),
  // Coraçõezinhos em volta
  extras: (color) => (
    <g className="chr-flick">
      <NeonTube d={heartPath(0.22, 12, 22)} color={color} width={2.2} />
      <NeonTube d={heartPath(0.18, 116, 30)} color={color} width={2.2} />
    </g>
  ),
}
