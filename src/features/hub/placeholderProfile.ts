import type { CharacterId } from '../../types/game'

/**
 * Valores fixos do topo do Hub até a FE-30 (GET /me) trazer o perfil de verdade.
 * Saldo inicial 0 e X como personagem inicial [RN-LOJ-01] (PROJECT_CONTEXT §8).
 */
export const HUB_PLACEHOLDER_PROFILE: {
  nickname: string
  coins: number
  favoriteCharacter: CharacterId
} = {
  nickname: 'Jogador',
  coins: 0,
  favoriteCharacter: 'X',
}
