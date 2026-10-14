// Tradução das mensagens que chegam do back para o envelope do front (ARCHITECTURE §6).
// [A VALIDAR COM O BACK] Se o formato mudar na FE-17, só este arquivo muda.
import type { ServerEnvelope } from '../types/events'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Aceita o formato combinado `{ type, payload, serverTime }` e o `GameMessage` que o back tem
 * hoje (`{ type, payload, timestamp }`). Devolve null para o que não der para entender: mensagem
 * estranha é ignorada em vez de quebrar a tela.
 */
export function parseServerMessage(body: string, receivedAt = Date.now()): ServerEnvelope | null {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!isRecord(data) || typeof data.type !== 'string') return null

  const serverTime =
    typeof data.serverTime === 'number'
      ? data.serverTime
      : typeof data.timestamp === 'number'
        ? data.timestamp
        : receivedAt

  return { type: data.type, payload: data.payload ?? {}, serverTime } as ServerEnvelope
}
