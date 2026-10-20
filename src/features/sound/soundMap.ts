// Mapa "evento do servidor → som", num arquivo só (nomes de arquivo provisórios).
// Os arquivos ficam em public/sounds/. A lista final de nomes sai da FE-38.
import { ABILITIES } from '../../constants/game'
import type { AbilityId } from '../../types/game'

export type AbilitySoundKey = `habilidade-${AbilityId}`

export type SoundKey =
  | 'jogada'
  | 'estouro-tempo'
  | 'fim-round'
  | 'morte-subita'
  | 'vitoria'
  | 'derrota'
  | 'empate'
  | 'coins'
  | 'botao'
  | 'trilha'
  | AbilitySoundKey

/** Som de cada uma das 10 habilidades: habilidade-<ID>.mp3 (ID em minúsculas) */
export const abilitySoundKey = (ability: AbilityId): AbilitySoundKey => `habilidade-${ability}`

const BASE_FILES = {
  jogada: '/sounds/jogada.mp3',
  'estouro-tempo': '/sounds/estouro-tempo.mp3',
  'fim-round': '/sounds/fim-round.mp3',
  'morte-subita': '/sounds/morte-subita.mp3',
  vitoria: '/sounds/vitoria.mp3',
  derrota: '/sounds/derrota.mp3',
  empate: '/sounds/empate.mp3',
  coins: '/sounds/coins.mp3',
  botao: '/sounds/botao.mp3',
  trilha: '/sounds/trilha.mp3',
}

const ABILITY_FILES = Object.fromEntries(
  ABILITIES.map((id) => [abilitySoundKey(id), `/sounds/habilidade-${id.toLowerCase()}.mp3`]),
) as Record<AbilitySoundKey, string>

export const SOUND_FILES: Record<SoundKey, string> = { ...BASE_FILES, ...ABILITY_FILES }

/** Sons que contam como música (o resto é efeito) */
export const MUSIC_KEYS: SoundKey[] = ['trilha']

/** O Coins toca um pouco depois do som de resultado, para não encavalar */
export const COINS_DELAY_MS = 800
