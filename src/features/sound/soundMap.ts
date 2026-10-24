// Sons do jogo: cada SoundKey é o nome de um arquivo em src/assets/sounds/<categoria>/ (FE-38).
// O Vite encontra os arquivos sozinho e gera a URL com hash: som novo é só soltar na pasta.
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

/** Som de cada uma das 10 habilidades: habilidades/habilidade-<id em minúsculas>.mp3 */
export const abilitySoundKey = (ability: AbilityId): AbilitySoundKey => `habilidade-${ability}`

const FILES = import.meta.glob<string>('../../assets/sounds/**/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** Nome do arquivo sem a pasta e a extensão (ex: "habilidade-bomba") */
const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1, -'.mp3'.length)

const URL_BY_NAME = new Map(Object.entries(FILES).map(([path, url]) => [fileName(path), url]))

/** URL do som; undefined se o arquivo não existir (o jogo segue sem ele) */
export const soundUrl = (key: SoundKey) => URL_BY_NAME.get(key.toLowerCase())

export const SOUND_KEYS: SoundKey[] = [
  'jogada',
  'estouro-tempo',
  'fim-round',
  'morte-subita',
  'vitoria',
  'derrota',
  'empate',
  'coins',
  'botao',
  'trilha',
  ...ABILITIES.map(abilitySoundKey),
]

/** Sons que contam como música (o resto é efeito) */
export const MUSIC_KEYS: SoundKey[] = ['trilha']

/** O Coins toca um pouco depois do som de resultado, para não encavalar */
export const COINS_DELAY_MS = 800
