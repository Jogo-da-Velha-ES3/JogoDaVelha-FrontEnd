// O que as telas usam para falar com a sala: entrar, mandar intenções e sair. Escolhe entre o
// servidor simulado (FE-35) e o cliente STOMP real (FE-18) pela variável de ambiente. Os dois
// são carregados sob demanda, só quando alguém entra numa sala.
import { applyServerEvent, resetGameStores } from '../stores/serverEvents'
import { useRoomStore } from '../stores/roomStore'
import type { ClientCommand, ServerEnvelope } from '../types/events'
import type { MockConnectionOptions } from './mock/mockConnection'
import { isMockServerEnabled } from './mode'
import type { GameConnection, Unsubscribe } from './types'

export { isMockServerEnabled }

export async function createGameConnection(
  mockOptions: MockConnectionOptions = {},
): Promise<GameConnection> {
  if (isMockServerEnabled()) {
    const [{ MockConnection }, { resolveScenario }] = await Promise.all([
      import('./mock/mockConnection'),
      import('./mock/scenarios'),
    ])
    return new MockConnection({
      scenario: resolveScenario(window.location.search, import.meta.env.VITE_MOCK_SCENARIO),
      ...mockOptions,
    })
  }

  const base = import.meta.env.VITE_WEBSOCKET_URL
  if (!base) throw new Error('VITE_WEBSOCKET_URL não está configurada.')
  const { StompConnection, toBrokerUrl } = await import('./stompConnection')
  return new StompConnection({ brokerURL: toBrokerUrl(base) })
}

let connection: GameConnection | null = null
let subscriptions: Unsubscribe[] = []
/** Cada entrada/saída invalida as anteriores (ex: o efeito duplo do StrictMode) */
let attempt = 0
const debugListeners = new Set<(event: ServerEnvelope) => void>()

export interface JoinRoomOptions {
  /** Conexão pronta (testes); sem isto, cria a do ambiente */
  connection?: GameConnection
  /** Opções do simulado (ex: cenário da vitrine) */
  mock?: MockConnectionOptions
}

/** Entra na sala: liga os eventos às stores e o status da conexão à roomStore */
export async function joinRoom(roomCode: string, options: JoinRoomOptions = {}) {
  leaveRoom()
  const current = ++attempt
  const conn = options.connection ?? (await createGameConnection(options.mock))
  if (current !== attempt) return // saiu ou entrou em outra sala enquanto carregava

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
  attempt += 1
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
