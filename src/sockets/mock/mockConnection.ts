import type { ClientCommand, ServerEnvelope } from '../../types/events'
import type { ConnectionStatus, GameConnection, Unsubscribe } from '../types'
import { MockGameServer } from './mockServer'
import type { BotDrop, BotRematch, Scenario } from './scenarios'

export interface MockConnectionOptions {
  scenario?: Scenario
  botRematch?: BotRematch
  botDrop?: BotDrop | null
  nickname?: string
  /** Atraso simulado da "rede", ida e volta (ms) */
  latencyMs?: number
  random?: () => number
}

/** Quedas de conexão sob demanda (vitrine e testes da FE-20). Só existe no simulado. */
export interface MockControls {
  /** A sua conexão cai por `ms` e volta, com o snapshot completo */
  simulateDrop(ms: number): void
  /** O bot cai (os turnos dele estouram) ou volta */
  dropOpponent(): void
  reconnectOpponent(): void
}

/** Mesma interface do cliente STOMP real: as telas não sabem com qual estão falando */
export class MockConnection implements GameConnection, MockControls {
  private server: MockGameServer | null = null
  /** Sem "rede": o que o servidor manda se perde, como numa queda de verdade */
  private offline = false
  private readonly eventListeners = new Set<(event: ServerEnvelope) => void>()
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()
  private readonly options: MockConnectionOptions

  constructor(options: MockConnectionOptions = {}) {
    this.options = options
  }

  private get latency() {
    return this.options.latencyMs ?? 80
  }

  private setStatus(status: ConnectionStatus) {
    this.statusListeners.forEach((listener) => listener(status))
  }

  private deliver(envelope: ServerEnvelope) {
    this.eventListeners.forEach((listener) => listener(envelope))
  }

  async connect(roomCode: string): Promise<void> {
    this.setStatus('CONNECTING')
    await new Promise((resolve) => setTimeout(resolve, this.latency))
    this.server = new MockGameServer({
      roomCode,
      scenario: this.options.scenario,
      botRematch: this.options.botRematch,
      botDrop: this.options.botDrop,
      nickname: this.options.nickname,
      random: this.options.random,
      emit: (envelope) => {
        if (this.offline) return
        setTimeout(() => {
          if (!this.offline) this.deliver(envelope)
        }, this.latency)
      },
    })
    this.setStatus('CONNECTED')
    this.server.start()
  }

  disconnect(): void {
    this.server?.stop()
    this.server = null
    this.offline = false
    this.setStatus('DISCONNECTED')
  }

  send(command: ClientCommand): void {
    const server = this.server
    if (server && this.offline) {
      // Igual ao cliente STOMP: sem conexão, a intenção vira um aviso local
      this.deliver({
        type: 'ERROR',
        payload: {
          code: 'NOT_CONNECTED',
          message: 'Sem conexão com o servidor. Tentando reconectar…',
        },
        serverTime: Date.now(),
        local: true,
      })
      return
    }
    if (server) setTimeout(() => server.handleClient(command), this.latency)
  }

  simulateDrop(ms: number): void {
    const server = this.server
    if (!server || this.offline) return
    this.offline = true
    this.setStatus('RECONNECTING')
    server.disconnect('P1')
    setTimeout(() => {
      if (this.server !== server) return // saiu da sala durante a queda
      this.offline = false
      this.setStatus('CONNECTED')
      server.reconnect('P1') // o servidor manda o ROOM_SNAPSHOT completo
    }, ms)
  }

  dropOpponent(): void {
    this.server?.disconnect('P2')
  }

  reconnectOpponent(): void {
    this.server?.reconnect('P2')
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
