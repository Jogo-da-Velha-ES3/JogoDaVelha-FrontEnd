import type { ClientCommand, ServerEnvelope } from '../types/events'

export type ConnectionStatus =
  'IDLE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR'

export type Unsubscribe = () => void

/**
 * Conexão de tempo real com a sala. O cliente STOMP real (FE-18) e o servidor simulado (FE-35)
 * implementam esta mesma interface, então as telas nunca sabem com qual estão falando.
 */
export interface GameConnection {
  connect(roomCode: string): Promise<void>
  disconnect(): void
  /** Envia uma intenção. O resultado só chega como evento do servidor. */
  send(command: ClientCommand): void
  onEvent(listener: (event: ServerEnvelope) => void): Unsubscribe
  onStatus(listener: (status: ConnectionStatus) => void): Unsubscribe
}
