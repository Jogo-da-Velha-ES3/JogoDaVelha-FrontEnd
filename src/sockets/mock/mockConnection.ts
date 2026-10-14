import type { ClientCommand, ServerEnvelope } from '../../types/events'
import type { ConnectionStatus, GameConnection, Unsubscribe } from '../types'
import { MockGameServer } from './mockServer'
import type { Scenario } from './scenarios'

export interface MockConnectionOptions {
  scenario?: Scenario
  nickname?: string
  /** Atraso simulado da "rede", ida e volta (ms) */
  latencyMs?: number
  random?: () => number
}

/** Mesma interface do cliente STOMP real: as telas não sabem com qual estão falando */
export class MockConnection implements GameConnection {
  private server: MockGameServer | null = null
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

  async connect(roomCode: string): Promise<void> {
    this.setStatus('CONNECTING')
    await new Promise((resolve) => setTimeout(resolve, this.latency))
    this.server = new MockGameServer({
      roomCode,
      scenario: this.options.scenario,
      nickname: this.options.nickname,
      random: this.options.random,
      emit: (envelope) =>
        setTimeout(
          () => this.eventListeners.forEach((listener) => listener(envelope)),
          this.latency,
        ),
    })
    this.setStatus('CONNECTED')
    this.server.start()
  }

  disconnect(): void {
    this.server?.stop()
    this.server = null
    this.setStatus('DISCONNECTED')
  }

  send(command: ClientCommand): void {
    const server = this.server
    if (server) setTimeout(() => server.handleClient(command), this.latency)
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
