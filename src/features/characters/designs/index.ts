import type { CharacterId } from '../../../types/game'
import { CORACAO_DESIGN } from './coracao'
import { ESTRELA_DESIGN } from './estrela'
import { O_DESIGN } from './o'
import { QUADRADO_DESIGN } from './quadrado'
import { TRIANGULO_DESIGN } from './triangulo'
import type { CharacterDesign } from './types'
import { X_DESIGN } from './x'

export const CHARACTER_DESIGNS: Record<CharacterId, CharacterDesign> = {
  X: X_DESIGN,
  O: O_DESIGN,
  TRIANGULO: TRIANGULO_DESIGN,
  QUADRADO: QUADRADO_DESIGN,
  ESTRELA: ESTRELA_DESIGN,
  CORACAO: CORACAO_DESIGN,
}
