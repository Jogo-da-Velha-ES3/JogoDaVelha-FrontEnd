// O que as telas usam para falar com a sala: entrar, mandar intenções e sair. Escolhe entre o
// servidor simulado (FE-35) e o cliente STOMP real (FE-18) pela variável de ambiente.
import { applyServerEvent, resetGameStores } from '../stores/serverEvents'
import { useRoomStore } from '../stores/roomStore'
import type { ClientCommand, ServerEnvelope } from '../types/events'
import { MockConnection, type MockConnectionOptions } from './mock/mockConnection'
import { resolveScenario } from './mock/scenarios'
import type { GameConnection, Unsubscribe } from './types'

/** Simulado por padrão até a FE-18 existir; desliga com VITE_USE_MOCK_SERVER=false */
export const isMockServerEnabled = () => import.meta.env.VITE_USE_MOCK_SERVER !== 'false'

export function createGameConnection(options: MockConnectionOptions = {}): GameConnection {
  if (isMockServerEnabled()) {
    return new MockConnection({
      scenario: resolveScenario(window.location.search, import.meta.env.VITE_MOCK_SCENARIO),
      ...options,
    })
  }
  throw new Error(
    'O cliente STOMP real chega na FE-18. Por enquanto, use VITE_USE_MOCK_SERVER=true.',
  )
}

let connection: GameConnection | null = null
let subscriptions: Unsubscribe[] = []
const debugListeners = new Set<(event: ServerEnvelope) => void>()

/** Entra na sala: liga os eventos às stores e o status da conexão à roomStore */
export async function joinRoom(roomCode: string, conn: GameConnection = createGameConnection()) {
  leaveRoom()
  connection = conn
  subscriptions = [
    conn.onEvent((event) => {
      applyServerEvent(event)
      debugListeners.forEach((listener) => listener(event))
    }),
    conn.onStatus((status) => useRoomStore.getState().setConnectionStatus(status)),
  ]
  await conn.connect(roomCode)
}

/** Manda uma intenção. O estado só muda quando o servidor responder com eventos. */
export function sendCommand(command: ClientCommand) {
  connection?.send(command)
}

/** Sai da sala e limpa o estado da partida */
export function leaveRoom() {
  if (!connection) return
  connection.send({ type: 'LEAVE', payload: {} })
  subscriptions.forEach((unsubscribe) => unsubscribe())
  subscriptions = []
  connection.disconnect()
  connection = null
  resetGameStores()
}

/** Só para depuração (log de eventos na vitrine). Telas usam as stores. */
export function onServerEventForDebug(listener: (event: ServerEnvelope) => void): Unsubscribe {
  debugListeners.add(listener)
  return () => debugListeners.delete(listener)
}
