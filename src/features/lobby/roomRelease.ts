// Sair de verdade de uma sala (AMB-01): pelo aviso de sala em andamento do Hub e depois de deixar a
// tela da sala. O back não responde à saída, então quem confirma é o `GET /rooms/active`.
import { ApiError } from '../../api/client'
import { checkActiveRoom, leaveWaitingRoom } from '../../api/rooms'
import type { ActiveRoom } from '../../lib/activeRoom'
import { sendLeaveFromOutside } from '../../sockets/gameClient'
import { clearActiveRoom, markRoomOpened } from '../../stores/activeRoomStore'

/** Espera para o back processar o `/leave` do STOMP antes de conferir se o jogador saiu */
export const ROOM_RELEASE_CHECK_MS = 1500

/** Cada saída pode deixar a sala noutra fase (a desistência leva a partida ao Resultado) */
const MAX_LEAVES = 3

export type LeaveOutcome =
  { status: 'RELEASED' } | { status: 'STILL_THERE'; room: ActiveRoom } | { status: 'UNKNOWN' }

export interface LeaveOptions {
  waitMs?: number
  /** Conferido antes de cada saída: false para (ex: o jogador voltou para a tela da sala) */
  shouldLeave?: () => boolean
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Manda a saída pelo caminho da fase: na Sala de Espera, o REST; nas outras, o `/leave` do STOMP.
 * Devolve true quando foi pelo STOMP, que o back processa depois.
 */
async function sendLeave(room: ActiveRoom): Promise<boolean> {
  if (room.phase === 'WAITING') {
    try {
      await leaveWaitingRoom(room.code)
      return false
    } catch (error) {
      // Alguém entrou nesse meio-tempo: a sala saiu da espera, e a saída é pelo STOMP
      if (!(error instanceof ApiError && error.status === 409)) throw error
    }
  }
  await sendLeaveFromOutside(room.code)
  return true
}

/**
 * Tira o jogador da sala e confere no servidor. A desistência (partida) deixa a sala no Resultado
 * com o jogador ainda nela: a saída se repete até o back dizer que ele está livre.
 */
export async function leaveActiveRoom(
  room: ActiveRoom,
  { waitMs = ROOM_RELEASE_CHECK_MS, shouldLeave = () => true }: LeaveOptions = {},
): Promise<LeaveOutcome> {
  let current = room
  for (let attempt = 0; attempt < MAX_LEAVES; attempt += 1) {
    if (!shouldLeave()) return { status: 'STILL_THERE', room: current }
    // Falha ao mandar (rede, conexão recusada) não decide nada: a conferência diz se saiu
    const sent = await sendLeave(current).then(
      (byStomp) => ({ ok: true, byStomp }),
      () => ({ ok: false, byStomp: false }),
    )
    if (sent.byStomp) await wait(waitMs)
    const check = await checkActiveRoom()
    if (check.status === 'UNKNOWN') return { status: 'UNKNOWN' }
    if (check.status === 'NONE' || check.room.code !== room.code) return { status: 'RELEASED' }
    // A saída nem foi mandada e nada mudou: tentar de novo só deixaria o jogador esperando
    if (!sent.ok && check.room.phase === current.phase) {
      return { status: 'STILL_THERE', room: check.room }
    }
    current = check.room
  }
  return { status: 'STILL_THERE', room: current }
}

/** Salas com a tela aberta agora: a liberação em segundo plano nunca tira o jogador delas */
const openOnScreen = new Set<string>()

/** A tela da sala abriu (RoomPage) */
export function roomScreenOpened(code: string) {
  openOnScreen.add(code)
  markRoomOpened()
}

/**
 * A tela da sala fechou, e com ela foi o `/leave`. Pouco depois, confere se o jogador ficou livre
 * e, se não, sai de novo. Cobre a saída que não chegou ao back (ex: "Voltar ao Hub" antes de a
 * conexão abrir) e a desistência, que deixa quem desistiu preso ao Resultado até o oponente sair.
 */
export function roomScreenClosed(code: string, waitMs = ROOM_RELEASE_CHECK_MS) {
  openOnScreen.delete(code)
  setTimeout(() => void releaseIfStillInRoom(code, waitMs), waitMs)
}

async function releaseIfStillInRoom(code: string, waitMs: number) {
  const left = () => !openOnScreen.has(code)
  if (!left()) return
  const check = await checkActiveRoom()
  if (check.status !== 'FOUND' || check.room.code !== code) return
  const outcome = await leaveActiveRoom(check.room, { waitMs, shouldLeave: left })
  if (outcome.status === 'RELEASED') clearActiveRoom(code)
}
