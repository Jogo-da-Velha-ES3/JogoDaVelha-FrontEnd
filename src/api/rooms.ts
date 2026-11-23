// Criar, entrar e sair de sala pelo REST [RF-HUB-04] [RF-HUB-05], e a sala em que o jogador ainda
// está (AMB-01). O jogador vem do token.
import { ROOM_CODE_LENGTH } from '../constants/game'
import { ROOM_TEXTS } from '../constants/texts'
import { parseActiveRoom, type ActiveRoom } from '../lib/activeRoom'
import { isMockServerEnabled } from '../sockets/mode'
import { ApiError, apiRequest } from './client'

export interface RoomInfo {
  code: string
}

const E = ROOM_TEXTS.errors

/** O back recusa criar ou entrar porque o jogador ainda está numa sala, a dele ou outra */
const ROOM_CONFLICT = 'ROOM_CONFLICT'

const ROOM_ERRORS: Record<string, (code: string) => string> = {
  ROOM_NOT_FOUND: E.notFound,
  ROOM_FULL: E.full,
  ROOM_ALREADY_STARTED: E.alreadyStarted,
  // Código inválido ou jogador não encontrado; o front só manda códigos de 4 dígitos
  ROOM_BAD_REQUEST: E.notFound,
  ROOM_CONFLICT: () => E.stillInRoom,
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

/**
 * Entra pelo endereço da sala (link compartilhado, link colado, volta do Acesso): o back só deixa
 * assinar a sala no STOMP depois do `POST /join`. Quem já está nesta sala (o host, quem recarrega a
 * página) recebe `ROOM_CONFLICT` e segue: o `GET /rooms/active` confirma que a sala é esta. Quem
 * ainda está em outra sala recebe o `ActiveRoomError`. Sem como saber, segue para o STOMP, que
 * confirma se a sala é esta.
 */
export async function enterRoomByLink(code: string): Promise<void> {
  try {
    await withRoomConflictCheck(() => joinRoomByCode(code))
  } catch (error) {
    if (error instanceof ActiveRoomError) {
      if (error.room.code === code) return
      throw error
    }
    if (error instanceof ApiError && error.code === ROOM_CONFLICT) return
    throw error
  }
}

/**
 * Sai da sala pelo REST. Só vale na Sala de Espera (o host fecha a sala); nas outras fases, a saída
 * é o `/leave` do STOMP. Sala que já não existe (404) conta como saída feita.
 */
export async function leaveWaitingRoom(code: string): Promise<void> {
  if (isMockServerEnabled()) return
  try {
    await apiRequest(`/rooms/${code}/leave`, { method: 'POST' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return
    throw error
  }
}

/**
 * Resposta do `GET /rooms/active` (AMB-01):
 * - `FOUND`: a sala em que o jogador ainda está
 * - `NONE`: nenhuma (204)
 * - `UNKNOWN`: não deu para saber (rede, erro do servidor, resposta inesperada). Quem pergunta segue
 *   como antes, sem prender o jogador em nenhuma tela
 */
export type ActiveRoomCheck =
  { status: 'FOUND'; room: ActiveRoom } | { status: 'NONE' } | { status: 'UNKNOWN' }

/** Pergunta ao back em que sala o jogador ainda está. Nunca lança erro. No simulado, nenhuma. */
export async function checkActiveRoom(): Promise<ActiveRoomCheck> {
  if (isMockServerEnabled()) return { status: 'NONE' }
  try {
    // 204 chega sem corpo, como null
    const data = await apiRequest<unknown>('/rooms/active')
    if (data === null) return { status: 'NONE' }
    const room = parseActiveRoom(data)
    return room ? { status: 'FOUND', room } : { status: 'UNKNOWN' }
  } catch {
    return { status: 'UNKNOWN' }
  }
}

/** O jogador ainda está noutra sala: a tela oferece voltar ou sair dela (AMB-01) */
export class ActiveRoomError extends ApiError {
  readonly room: ActiveRoom

  constructor(room: ActiveRoom) {
    super(409, E.inRoom(room.code), 'ACTIVE_ROOM')
    this.name = 'ActiveRoomError'
    this.room = room
  }
}

const isRoomConflict = (error: unknown) => error instanceof ApiError && error.code === ROOM_CONFLICT

/**
 * Criar ou entrar numa sala quando o back responde `ROOM_CONFLICT` (o jogador ainda está numa sala):
 * pergunta qual é e lança o `ActiveRoomError` com ela. Se o back diz que não há nenhuma (a sala
 * acabou de ser liberada), tenta de novo uma vez. Sem como saber, lança o erro com "Você ainda está
 * em uma sala".
 */
export async function withRoomConflictCheck<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if (!isRoomConflict(error)) throw error
  }
  const check = await checkActiveRoom()
  if (check.status === 'FOUND') throw new ActiveRoomError(check.room)
  if (check.status === 'NONE') {
    try {
      return await action()
    } catch (error) {
      if (!isRoomConflict(error)) throw error
    }
  }
  throw new ApiError(409, E.stillInRoom, ROOM_CONFLICT)
}
