import type { CharacterId } from '../types/game'

export interface CharacterInfo {
  name: string
  /** Cor do personagem, que também é a cor do lado do jogador na interface */
  color: string
  /** Preço na Loja; 0 = já vem desbloqueado [RN-LOJ-01] */
  price: number
}

// Paleta oficial do Estilo A (letreiro neon) — docs/PROJECT_CONTEXT.md §4
export const CHARACTER_INFO: Record<CharacterId, CharacterInfo> = {
  X: { name: 'X', color: '#b07cff', price: 0 },
  O: { name: 'O', color: '#2ee6d6', price: 0 },
  QUADRADO: { name: 'Quadrado', color: '#ff9a3c', price: 400 },
  TRIANGULO: { name: 'Triângulo', color: '#8be04e', price: 500 },
  CORACAO: { name: 'Coração', color: '#ff5ca8', price: 600 },
  ESTRELA: { name: 'Estrela', color: '#ffd84a', price: 700 },
}
