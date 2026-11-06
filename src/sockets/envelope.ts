// Tradução das mensagens do back (contrato V2) para os eventos do front (types/events.ts). Os nomes
// do back (`firstPlayer`, `skillCode`, `targetPosition`...) ficam só aqui e em destinations.ts.
import { APP_TEXTS } from '../constants/texts'
import type { ServerEnvelope } from '../types/events'
import type { PlayerState } from '../types/game'

type Payload = Record<string, unknown>

const isRecord = (value: unknown): value is Payload =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === 'string' ? value : null)
const cell = (value: unknown) => (typeof value === 'number' ? value : null)

/**
 * Aceita o envelope `{ type, payload, serverTime }` (ou `timestamp`, do `GameMessage` antigo) e o
 * erro da fila `/user/queue/errors`, que vem no formato do REST (`{ code, message, timestamp }`, sem
 * `type`). Devolve null para o que não der para entender ou que o front não usa: mensagem estranha
 * é ignorada em vez de quebrar a tela.
 */
export function parseServerMessage(body: string, receivedAt = Date.now()): ServerEnvelope | null {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!isRecord(data)) return null
  if (typeof data.type !== 'string') return parseBackError(data, receivedAt)

  const serverTime =
    typeof data.serverTime === 'number'
      ? data.serverTime
      : typeof data.timestamp === 'number'
        ? data.timestamp
        : receivedAt

  const payload = translatePayload(data.type, isRecord(data.payload) ? data.payload : {})
  if (payload === null) return null
  return { type: data.type, payload, serverTime } as ServerEnvelope
}

/** Payload do back → payload do evento do front. null = descartar a mensagem. */
function translatePayload(type: string, payload: Payload): Payload | null {
  switch (type) {
    case 'ROOM_SNAPSHOT':
      // O tópico da sala recebe a versão pública (sem `mySlot` e sem deck); cada jogador recebe a
      // sua, completa, na fila privada. Aplicar a pública apagaria o "quem sou eu".
      return payload.mySlot == null ? null : payload

    case 'PLAYER_JOINED': {
      // O convidado sempre entra como P2. O snapshot que vem logo depois completa o resto
      const guest: PlayerState = {
        slot: 'P2',
        userId: text(payload.guestId) ?? '',
        nickname: text(payload.opponentName) ?? '',
        character: null,
        roundsWon: 0,
        consecutiveTimeouts: 0,
        forceFieldTurnsLeft: 0,
        silenced: false,
        connected: true,
      }
      return { player: guest }
    }

    case 'ROUND_START':
      return {
        round: payload.round,
        startingPlayer: payload.firstPlayer,
        suddenDeath: payload.suddenDeath === true,
      }

    case 'ABILITY_RESOLVED':
      return {
        by: payload.by,
        ability: payload.skillCode,
        targetCell: cell(payload.targetPosition),
        destinationCell: cell(payload.destinationPosition),
        absorbed: payload.absorbed === true,
        noEffect: payload.noEffect === true,
      }

    case 'ROUND_END':
      // Empate não traz `winningLine`
      return {
        ...payload,
        winningLine: Array.isArray(payload.winningLine) ? payload.winningLine : null,
      }

    default:
      return payload
  }
}

/**
 * Erro do back fora do envelope (`/user/queue/errors`). O `code` vem do catálogo do back
 * (`NOT_YOUR_TURN`, `SKILL_ALREADY_USED`, `ROOM_CONFLICT`...).
 */
function parseBackError(data: Payload, receivedAt: number): ServerEnvelope | null {
  if (typeof data.code !== 'string') return null
  const timestamp = Date.parse(text(data.timestamp) ?? '')
  return {
    type: 'ERROR',
    payload: {
      code: data.code,
      message: text(data.message) ?? text(data.error) ?? APP_TEXTS.errors.actionFailed,
    },
    serverTime: Number.isNaN(timestamp) ? receivedAt : timestamp,
  } as ServerEnvelope
}
