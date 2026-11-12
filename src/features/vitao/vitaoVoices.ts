// Voz do Vitão fora do balão (FE-48): os anúncios gravados (só a voz, o banner já mostra o título)
// e as falas do Resultado, que não tem o Vitão. A voz das falas do balão vem do `audio` de cada
// fala em vitaoLines.ts e toca pelo VitaoSlot.
import { announcementFor, type Announcement } from '../../lib/vitaoAnnouncements'
import type { ResultKind } from '../../lib/result'
import type { VitaoVoiceKey } from '../../lib/vitao'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import type { ServerEvent } from '../../types/events'
import { isFilteredVoice, VOICE_KEYS } from '../sound/soundMap'
import { playVoice } from '../sound/soundManager'

/** Gravação [E] e [C] de uma fala; a que só tem uma versão usa a mesma nos dois modos */
interface VoicePair {
  unfiltered: VitaoVoiceKey
  filtered: VitaoVoiceKey
}

const same = (key: VitaoVoiceKey): VoicePair => ({ unfiltered: key, filtered: key })
const pair = (key: VitaoVoiceKey): VoicePair => ({ unfiltered: key, filtered: `${key}-filtrado` })

/** Versão da fala pelo filtro de linguagem das Configurações */
export const pickVoice = (voice: VoicePair, filterOn: boolean) =>
  filterOn ? voice.filtered : voice.unfiltered

/** Cada anúncio e as suas gravações; com mais de uma, sorteia (as duas do Confronto) */
export const ANNOUNCEMENT_VOICES: Record<Announcement, readonly VitaoVoiceKey[]> = {
  VERSUS: ['vitao-confronto', 'vitao-confronto-2'],
  ROUND_1: ['vitao-round-1'],
  ROUND_2: ['vitao-round-2'],
  ROUND_DRAW: ['vitao-round-empatado'],
  ABSOLUTE_DRAW: ['vitao-empate-absoluto'],
  OPPONENT_TIMEOUT: ['vitao-oponente-perdeu-a-vez'],
}

/**
 * Voz do Resultado, só quando o resultado acaba de chegar. O 2×0 toca "Vitória implacável!", como
 * o Rafik gravou (o título continua "Vitória impecável", da ERS). W.O. e empate absoluto não têm:
 * a Arena já falou deles antes do Resultado.
 */
export const RESULT_VOICES: Partial<Record<ResultKind, VoicePair>> = {
  WIN_FLAWLESS: same('vitao-vitoria-implacavel'),
  WIN: pair('vitao-vitoria'),
  LOSS: pair('vitao-derrota'),
}

/** "O oponente sentiu a pressão, neném!": o oponente saiu da sala no Resultado */
export const OPPONENT_LEFT_VOICE = pair('vitao-oponente-saiu')

/**
 * Falas que podem tocar com o filtro ligado ou desligado, para baixar antes da partida: sem
 * filtro, todas menos as "-filtrado"; com o filtro, as "-filtrado" e as que só têm uma versão.
 */
export function voicesFor(filterOn: boolean): VitaoVoiceKey[] {
  if (!filterOn) return VOICE_KEYS.filter((key) => !isFilteredVoice(key))
  return VOICE_KEYS.filter((key) => isFilteredVoice(key) || !VOICE_KEYS.includes(`${key}-filtrado`))
}

/**
 * Anúncio gravado para um evento ao vivo do servidor. Chamada por applyServerEvent antes de ele
 * atualizar as stores (o estado de antes decide), como o som dos eventos.
 */
export function playAnnouncementForServerEvent(event: ServerEvent, random = Math.random) {
  const match = useMatchStore.getState()
  const room = useRoomStore.getState()
  const announcement = announcementFor(event, {
    phase: room.phase,
    round: match.round,
    score: match.score,
    suddenDeath: match.suddenDeath,
    mySlot: room.mySlot,
  })
  if (!announcement) return
  const voices = ANNOUNCEMENT_VOICES[announcement]
  playVoice(voices[Math.floor(random() * voices.length)])
}
