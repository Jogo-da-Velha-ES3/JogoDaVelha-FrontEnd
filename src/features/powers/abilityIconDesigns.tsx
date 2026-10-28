import type { ReactNode } from 'react'
import { NeonDot, NeonTube } from '../characters/NeonTube'
import type { AbilityId } from '../../types/game'

/** Espessura do tubo nos ícones: em 20px vira ~1,4px, o mínimo para o brilho aparecer */
const W = 3.4
/** Detalhes menores (faíscas, brilho da cúpula) */
const THIN = 2.4

/** Três braços e seis pontas em "V": calculado para ficar simétrico (Congelar) */
function snowflakePath(cx: number, cy: number, r: number): string {
  const parts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2
    const [ux, uy] = [Math.cos(a), Math.sin(a)]
    const at = (d: number, side = 0, s = 0) =>
      `${(cx + ux * d - uy * side * s).toFixed(1)} ${(cy + uy * d + ux * side * s).toFixed(1)}`
    parts.push(`M${at(0)} L${at(r)}`)
    // Ponta em "V" perto da ponta do braço: curta, para não formar um anel (lia como teia)
    parts.push(`M${at(r * 0.62, 1, 3.6)} L${at(r * 0.82)} L${at(r * 0.62, -1, 3.6)}`)
  }
  return parts.join(' ')
}

/** Hexágono com a ponta para cima (Campo de Força) */
function hexagonPath(cx: number, cy: number, r: number): string {
  const points = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`
  })
  return `M${points.join(' L')} Z`
}

/**
 * Os 10 ícones de habilidade no Estilo A (letreiro neon), em coordenadas de 48×48. Cada um é
 * desenhado com a cor recebida: o `AbilityIcon` passa `currentColor`, então quem usa decide a cor
 * (a do personagem na Arena, a principal no resto).
 */
export const ABILITY_ICON_DESIGNS: Record<AbilityId, (color: string) => ReactNode> = {
  // Bomba de desenho animado: corpo redondo, tampa em cima, pavio curvo e faísca
  BOMBA: (c) => (
    <>
      <NeonTube d="M7 31 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0" color={c} width={W} />
      <NeonTube d="M15.5 18.5 V14 H24.5 V18.5" color={c} width={W} />
      <NeonTube d="M20 14 Q20 7 28 7.5" color={c} width={THIN} />
      <NeonTube d="M13 30 A7 7 0 0 1 17 24.5" color={c} width={THIN} />
      <NeonTube d="M32 1.5 V4 M38 7.5 H35.5 M36.5 3 L34.8 4.7" color={c} width={THIN - 0.6} />
      <NeonDot cx={31} cy={7.5} r={2} />
    </>
  ),

  // Casa vazia (quadrado) protegida por um escudo
  ESCUDO: (c) => (
    <>
      <NeonTube
        d="M11 6 H37 Q42 6 42 11 V37 Q42 42 37 42 H11 Q6 42 6 37 V11 Q6 6 11 6 Z"
        color={c}
        width={W}
      />
      <NeonTube d="M24 13 L33 16.5 V23 Q33 31 24 35.5 Q15 31 15 23 V16.5 Z" color={c} width={W} />
    </>
  ),

  // Ampulheta com a areia embaixo
  AMPULHETA: (c) => (
    <>
      <NeonTube d="M12 6 H36 M12 42 H36" color={c} width={W} />
      <NeonTube
        d="M15.5 6 Q15.5 18 24 24 Q32.5 18 32.5 6 M15.5 42 Q15.5 30 24 24 Q32.5 30 32.5 42"
        color={c}
        width={W}
      />
      <NeonTube d="M19 38.5 Q24 33.5 29 38.5" color={c} width={THIN} />
    </>
  ),

  // Traços que diminuem e vão para os lados, como um funil girando
  TORNADO: (c) => (
    <NeonTube d="M6 8 H42 M10 16 H36 M16 24 H38 M15 32 H29 M21 40 H26" color={c} width={W} />
  ),

  // Espiral puxando para o centro
  BURACO_NEGRO: (c) => (
    <>
      <NeonTube
        d="M24 24 a3.5 3.5 0 0 1 7 0 a7 7 0 0 1 -14 0 a10.5 10.5 0 0 1 21 0 a14 14 0 0 1 -28 0"
        color={c}
        width={W}
      />
      <NeonDot cx={24} cy={24} r={1.6} />
    </>
  ),

  // Floco de neve de 6 pontas
  CONGELAR: (c) => <NeonTube d={snowflakePath(24, 24, 18)} color={c} width={W - 0.4} />,

  // Barreira em hexágono (camada externa e interna): não se confunde com o Escudo
  CAMPO_DE_FORCA: (c) => (
    <>
      <NeonTube d={hexagonPath(24, 24, 20)} color={c} width={W} />
      <NeonTube d={hexagonPath(24, 24, 10)} color={c} width={THIN} />
    </>
  ),

  // Balão de fala riscado
  SILENCIO: (c) => (
    <>
      <NeonTube
        d="M11 9 H37 Q42 9 42 14 V26 Q42 31 37 31 H21 L13 38 V31 H11 Q6 31 6 26 V14 Q6 9 11 9 Z"
        color={c}
        width={W}
      />
      <NeonTube d="M6 43 L42 4" color={c} width={W} />
    </>
  ),

  // Duas setas trocando de lugar
  TROCA_RAPIDA: (c) => (
    <>
      <NeonTube d="M7 15 H39 M32 8 L39 15 L32 22" color={c} width={W} />
      <NeonTube d="M41 33 H9 M16 26 L9 33 L16 40" color={c} width={W} />
    </>
  ),

  // Peça reforçada: anel com duas setas para cima
  REFORCO: (c) => (
    <>
      <NeonTube d="M15 34 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0" color={c} width={W} />
      <NeonTube d="M14 14 L24 5.5 L34 14 M16 21.5 L24 15 L32 21.5" color={c} width={W} />
    </>
  ),
}
