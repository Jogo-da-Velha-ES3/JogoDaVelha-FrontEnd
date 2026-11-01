// Cliente STOMP real (FE-18), com a mesma GameConnection do servidor simulado: as telas não
// sabem com qual estão falando. Destinos em destinations.ts, tradução em envelope.ts.
import { Client, type IMessage, type StompConfig, type StompSubscription } from '@stomp/stompjs'
import { getAuthToken } from '../api/session'
import { APP_TEXTS } from '../constants/texts'
import type { ClientCommand, ServerEnvelope } from '../types/events'
import {
  commandDestination,
  ERRORS_QUEUE,
  joinDestination,
  PRIVATE_QUEUE,
  roomTopic,
} from './destinations'
import { parseServerMessage } from './envelope'
import type { ConnectionStatus, GameConnection, Unsubscribe } from './types'

/** `http://host` → `ws://host/ws` (o endpoint do back é WebSocket puro, sem SockJS) */
export function toBrokerUrl(base: string): string {
  const url = new URL(base)
  if (url.protocol === 'https:') url.protocol = 'wss:'
  if (url.protocol === 'http:') url.protocol = 'ws:'
  const path = url.pathname.replace(/\/$/, '')
  url.pathname = path.endsWith('/ws') ? path : `${path}/ws`
  return url.toString()
}

export interface StompConnectionOptions {
  brokerURL: string
  getToken?: () => string | null
  reconnectDelayMs?: number
  /** Tempo máximo para a primeira conexão antes de desistir do connect() */
  connectTimeoutMs?: number
  /** Só para testes: troca o Client do stompjs por um falso */
  createClient?: (config: StompConfig) => Client
}

export class StompConnection implements GameConnection {
  private readonly options: StompConnectionOptions
  private client: Client | null = null
  private roomCode: string | null = null
  private subscriptions: StompSubscription[] = []
  private connectedOnce = false
  private readonly eventListeners = new Set<(event: ServerEnvelope) => void>()
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()

  constructor(options: StompConnectionOptions) {
    this.options = options
  }

  connect(roomCode: string): Promise<void> {
    this.roomCode = roomCode
    this.connectedOnce = false
    this.setStatus('CONNECTING')
    const getToken = this.options.getToken ?? getAuthToken
    const create = this.options.createClient ?? ((config: StompConfig) => new Client(config))

    return new Promise((resolve, reject) => {
      let settled = false
      const settle = (error?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (error) reject(error)
        else resolve()
      }
      const timer = setTimeout(
        () => settle(new Error(APP_TEXTS.errors.connectTimeout)),
        this.options.connectTimeoutMs ?? 10_000,
      )

      this.client = create({
        brokerURL: this.options.brokerURL,
        reconnectDelay: this.options.reconnectDelayMs ?? 2000,
        heartbeatIncoming: 10_000,
        heartbeatOutgoing: 10_000,
        // A cada tentativa (inclusive reconexões), o token mais recente
        beforeConnect: (client) => {
          const token = getToken()
          client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
        },
        onConnect: () => {
          this.connectedOnce = true
          this.subscribeRoom()
          this.setStatus('CONNECTED')
          settle()
        },
        onStompError: (frame) => {
          const message = frame.headers.message || APP_TEXTS.errors.connectionRefused
          this.setStatus('ERROR')
          if (settled) this.emitLocalError('CONNECTION_ERROR', message)
          settle(new Error(message))
        },
        onWebSocketClose: () => {
          // O stompjs tenta de novo sozinho enquanto o cliente estiver ativo
          if (this.client?.active)
            this.setStatus(this.connectedOnce ? 'RECONNECTING' : 'CONNECTING')
        },
      })
      this.client.activate()
    })
  }

  /** Assina a sala e a fila privada e pede o estado completo. Roda de novo a cada reconexão. */
  private subscribeRoom() {
    const client = this.client
    const code = this.roomCode
    if (!client || !code) return
    // Depois de uma queda as assinaturas antigas morreram junto com a conexão
    this.subscriptions = [roomTopic(code), PRIVATE_QUEUE, ERRORS_QUEUE].map((destination) =>
      client.subscribe(destination, (message: IMessage) => this.receive(message.body)),
    )
    client.publish({ destination: joinDestination(code), body: '{}' })
  }

  private receive(body: string) {
    const envelope = parseServerMessage(body)
    if (envelope) this.eventListeners.forEach((listener) => listener(envelope))
  }

  private emitLocalError(code: string, message: string) {
    const envelope = {
      type: 'ERROR',
      payload: { code, message },
      serverTime: Date.now(),
      local: true,
    } as ServerEnvelope
    this.eventListeners.forEach((listener) => listener(envelope))
  }

  private setStatus(status: ConnectionStatus) {
    this.statusListeners.forEach((listener) => listener(status))
  }

  disconnect(): void {
    const client = this.client
    this.client = null
    if (client?.connected) this.subscriptions.forEach((s) => s.unsubscribe())
    this.subscriptions = []
    void client?.deactivate()
    this.setStatus('DISCONNECTED')
  }

  send(command: ClientCommand): void {
    if (!this.client?.connected || !this.roomCode) {
      this.emitLocalError('NOT_CONNECTED', APP_TEXTS.errors.notConnected)
      return
    }
    this.client.publish({
      destination: commandDestination(this.roomCode, command.type),
      body: JSON.stringify(command.payload),
    })
  }

  onEvent(listener: (event: ServerEnvelope) => void): Unsubscribe {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onStatus(listener: (status: ConnectionStatus) => void): Unsubscribe {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }
}
