import type { ReactNode } from 'react'

/** Animação do corpo inteiro na versão grande (classes em characters.css) */
export type BodyMotion = 'bob' | 'tilt' | 'stomp' | 'beat'

/**
 * Desenho de um personagem no Estilo A, em coordenadas de 160×170 com o corpo perto de (80, 78).
 * Classes `chr-*` nos elementos só animam dentro de um <Character> animado.
 */
export interface CharacterDesign {
  /** Recorte só do corpo, usado na peça do tabuleiro e no avatar */
  pieceViewBox: string
  motion: BodyMotion
  /** Largura da sombra no chão (versão grande) */
  shadowRx: number
  /** Corpo + rosto: aparece nas 3 versões */
  body: (color: string) => ReactNode
  /** Enfeites em volta (faíscas, anel, brilhos): só na versão grande */
  extras?: (color: string) => ReactNode
}
