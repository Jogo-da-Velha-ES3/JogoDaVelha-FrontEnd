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
  | 'trilha-hub'
  | 'trilha-sala'
  | 'trilha-arena'
  | 'trilha-morte-subita'
  | 'coracao'
  | 'tique-taque'
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

/**
 * Voz do Vitão (FE-48): as falas gravadas do Rafik, em sounds/vitao/. A chave é o nome do arquivo
 * sem a extensão; a versão [C] (filtro ligado) termina em "-filtrado".
 */
export type VoiceKey = `vitao-${string}`

/** URL da fala; undefined se o arquivo não existir (o Vitão fala só por escrito) */
export const voiceUrl = (key: VoiceKey) => URL_BY_NAME.get(key)

/** Todas as falas gravadas que existem na pasta */
export const VOICE_KEYS = [...URL_BY_NAME.keys()].filter((name): name is VoiceKey =>
  name.startsWith('vitao-'),
)

/** Versão [C] de uma fala: o sufixo "-filtrado" */
export const isFilteredVoice = (key: VoiceKey) => key.endsWith('-filtrado')

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
  'trilha-hub',
  'trilha-sala',
  'trilha-arena',
  'trilha-morte-subita',
  'coracao',
  'tique-taque',
  ...ABILITIES.map(abilitySoundKey),
]

/**
 * Trilhas, que contam como música (o resto é efeito) e tocam em loop, uma por vez. O Resultado
 * não tem trilha: a vinheta de vitória, derrota ou empate é o efeito do MATCH_END.
 */
export const MUSIC_KEYS: SoundKey[] = [
  'trilha-hub',
  'trilha-sala',
  'trilha-arena',
  'trilha-morte-subita',
]

/** O Coins toca um pouco depois do som de resultado, para não encavalar */
export const COINS_DELAY_MS = 800
