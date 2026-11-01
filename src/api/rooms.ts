// Criar e entrar em sala pelo REST [RF-HUB-04] [RF-HUB-05]. O jogador vem do token.
// ⚠️ Hoje o back ainda pede `?playerId=`; a BE-009.1 troca pelo usuário do JWT (contrato do back).
import { ROOM_CODE_LENGTH } from '../constants/game'
import { ROOM_TEXTS } from '../constants/texts'
import { isMockServerEnabled } from '../sockets/mode'
import { ApiError, apiRequest } from './client'

export interface RoomInfo {
  code: string
}

const E = ROOM_TEXTS.errors

const ROOM_ERRORS: Record<string, (code: string) => string> = {
  ROOM_NOT_FOUND: E.notFound,
  ROOM_FULL: E.full,
  ROOM_ALREADY_STARTED: E.alreadyStarted,
  // ⚠️ Códigos temporários do back até a BE-009.1 (contrato-integracao.md do back): sala
  // inexistente chega como 400 ROOM_BAD_REQUEST, e cheia/começada como 409 ROOM_CONFLICT
  ROOM_BAD_REQUEST: E.notFound,
  ROOM_CONFLICT: E.fullOrStarted,
}

/** Mensagem para a tela: pelo `code` do back quando houver, senão pelo status HTTP */
export function roomErrorMessage(error: ApiError, code: string): string {
  const byCode = error.code ? ROOM_ERRORS[error.code] : undefined
  if (byCode) return byCode(code)
  if (error.status === 404) return E.notFound(code)
  if (error.status === 409) return E.fullOrStarted(code)
  return error.message
}

const randomRoomCode = () =>
  Array.from({ length: ROOM_CODE_LENGTH }, () => Math.floor(Math.random() * 10)).join('')

/** Cria uma sala e devolve o código de 4 dígitos. No simulado, só sorteia o código. */
export async function createRoom(): Promise<RoomInfo> {
  if (isMockServerEnabled()) return { code: randomRoomCode() }
  const room = await apiRequest<{ code: string }>('/rooms', { method: 'POST' })
  return { code: room.code }
}

/**
 * Entra numa sala pelo código. Erros viram mensagens prontas para mostrar em vermelho
 * ("Sala 4821 não encontrada") [RN-HUB-01]. No simulado, sempre entra.
 */
export async function joinRoomByCode(code: string): Promise<RoomInfo> {
  if (isMockServerEnabled()) return { code }
  try {
    await apiRequest(`/rooms/${code}/join`, { method: 'POST' })
    return { code }
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError(error.status, roomErrorMessage(error, code), error.code)
    }
    throw error
  }
}
