// Tradução das mensagens que chegam do back para o envelope do front (ARCHITECTURE §6).
// [A VALIDAR COM O BACK] Se o formato mudar na FE-17, só este arquivo muda.
import type { ServerEnvelope } from '../types/events'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Aceita o formato combinado `{ type, payload, serverTime }`, o `GameMessage` que o back tem hoje
 * (`{ type, payload, timestamp }`) e o erro da fila `/user/queue/errors`, que vem no formato do
 * REST (`{ code, message, timestamp }`, sem `type`). Devolve null para o que não der para
 * entender: mensagem estranha é ignorada em vez de quebrar a tela.
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

  return { type: data.type, payload: data.payload ?? {}, serverTime } as ServerEnvelope
}

/**
 * Erro do back fora do envelope. ⚠️ Hoje o STOMP manda o `code` como nome do status HTTP
 * (`BAD_REQUEST`, `CONFLICT`…) e a frase em `error`; o pedido é usar o catálogo do REST (BE-044).
 */
function parseBackError(data: Record<string, unknown>, receivedAt: number): ServerEnvelope | null {
  if (typeof data.code !== 'string') return null
  const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : null)
  const timestamp = Date.parse(text('timestamp') ?? '')
  return {
    type: 'ERROR',
    payload: {
      code: data.code,
      message: text('message') ?? text('error') ?? 'Não foi possível fazer essa ação.',
    },
    serverTime: Number.isNaN(timestamp) ? receivedAt : timestamp,
  } as ServerEnvelope
}
