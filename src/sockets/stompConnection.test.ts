import type { Client, IFrame, IMessage, StompConfig } from '@stomp/stompjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServerEnvelope } from '../types/events'
import type { ConnectionStatus } from './types'
import { StompConnection, toBrokerUrl } from './stompConnection'

/** Cliente STOMP falso: guarda o que o código pede e deixa o teste simular o broker */
class FakeClient {
  config: StompConfig
  active = false
  connected = false
  connectHeaders: Record<string, string> = {}
  subscriptions: {
    destination: string
    callback: (m: IMessage) => void
    unsubscribe: () => void
  }[] = []
  published: { destination: string; body?: string }[] = []

  constructor(config: StompConfig) {
    this.config = config
  }

  activate() {
    this.active = true
    void this.config.beforeConnect?.(this as unknown as Client)
  }

  deactivate() {
    this.active = false
    this.connected = false
    return Promise.resolve()
  }

  subscribe(destination: string, callback: (m: IMessage) => void) {
    const subscription = { destination, callback, unsubscribe: vi.fn<() => void>() }
    this.subscriptions.push(subscription)
    return subscription
  }

  publish(params: { destination: string; body?: string }) {
    this.published.push(params)
  }

  // --- o "broker" ---
  open() {
    this.connected = true
    this.config.onConnect?.({} as IFrame)
  }

  drop() {
    this.connected = false
    this.config.onWebSocketClose?.({} as CloseEvent)
  }

  deliver(destination: string, body: string) {
    this.subscriptions
      .filter((s) => s.destination === destination)
      .forEach((s) => s.callback({ body } as IMessage))
  }

  stompError(message: string) {
    this.config.onStompError?.({ headers: { message } } as unknown as IFrame)
  }
}

let fake: FakeClient
let events: ServerEnvelope[]
let statuses: ConnectionStatus[]

function setup(token: string | null = 'token-123') {
  const connection = new StompConnection({
    brokerURL: 'ws://localhost:8080/ws',
    getToken: () => token,
    connectTimeoutMs: 5000,
    createClient: (config) => {
      fake = new FakeClient(config)
      return fake as unknown as Client
    },
  })
  events = []
  statuses = []
  connection.onEvent((e) => events.push(e))
  connection.onStatus((s) => statuses.push(s))
  return connection
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toBrokerUrl', () => {
  it.each([
    ['http://localhost:8080', 'ws://localhost:8080/ws'],
    ['https://jdv-back.onrender.com', 'wss://jdv-back.onrender.com/ws'],
    ['https://jdv-back.onrender.com/', 'wss://jdv-back.onrender.com/ws'],
    ['https://jdv-back.onrender.com/ws', 'wss://jdv-back.onrender.com/ws'],
  ])('%s → %s', (base, expected) => {
    expect(toBrokerUrl(base)).toBe(expected)
  })
})

describe('StompConnection', () => {
  it('conecta com o token, assina a sala e a fila privada e pede o snapshot', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    expect(statuses).toEqual(['CONNECTING'])
    expect(fake.connectHeaders).toEqual({ Authorization: 'Bearer token-123' })

    fake.open()
    await connected
    expect(statuses.at(-1)).toBe('CONNECTED')
    expect(fake.subscriptions.map((s) => s.destination)).toEqual([
      '/topic/rooms/4821',
      '/user/queue/room',
      '/user/queue/errors',
    ])
    expect(fake.published).toEqual([{ destination: '/app/rooms/4821/connect', body: '{}' }])
  })

  it('sem token, conecta sem o header (o servidor decide se aceita)', () => {
    void setup(null).connect('4821')
    expect(fake.connectHeaders).toEqual({})
  })

  it('entrega os eventos traduzidos, inclusive no formato atual do back', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    fake.open()
    await connected

    fake.deliver(
      '/topic/rooms/4821',
      JSON.stringify({ type: 'BOARD_UPDATE', payload: { board: [] }, timestamp: 1234 }),
    )
    fake.deliver('/user/queue/room', 'isso não é JSON')
    expect(events).toEqual([{ type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 1234 }])
  })

  it('erro do back na fila de erros (formato do REST) vira ERROR para a tela', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    fake.open()
    await connected

    fake.deliver(
      '/user/queue/errors',
      JSON.stringify({
        code: 'CONFLICT',
        error: 'Conflict',
        message: 'Não é a sua vez',
        status: 409,
        timestamp: '2026-10-15T12:00:00Z',
      }),
    )
    expect(events).toEqual([
      {
        type: 'ERROR',
        payload: { code: 'CONFLICT', message: 'Não é a sua vez' },
        serverTime: Date.parse('2026-10-15T12:00:00Z'),
      },
    ])
  })

  it('cada intenção vai para o seu destino', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    fake.open()
    await connected

    connection.send({ type: 'MOVE', payload: { cell: 5 } })
    connection.send({ type: 'DRAFT_CHARACTER', payload: { character: 'ESTRELA' } })
    expect(fake.published.slice(1)).toEqual([
      { destination: '/app/rooms/4821/move', body: '{"cell":5}' },
      { destination: '/app/rooms/4821/draft/character', body: '{"character":"ESTRELA"}' },
    ])
  })

  it('sem conexão, a intenção vira um erro local (que não mexe no relógio)', () => {
    const connection = setup()
    void connection.connect('4821')
    connection.send({ type: 'MOVE', payload: { cell: 0 } })
    expect(events).toEqual([
      expect.objectContaining({
        type: 'ERROR',
        payload: expect.objectContaining({ code: 'NOT_CONNECTED' }),
        local: true,
      }),
    ])
  })

  it('caiu: avisa "reconectando" e, ao voltar, assina de novo e pede outro snapshot', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    fake.open()
    await connected

    fake.drop()
    expect(statuses.at(-1)).toBe('RECONNECTING')

    fake.open()
    expect(statuses.at(-1)).toBe('CONNECTED')
    expect(fake.subscriptions).toHaveLength(6)
    expect(fake.published.filter((p) => p.destination.endsWith('/connect'))).toHaveLength(2)
  })

  it('várias quedas seguidas: cada mensagem chega uma vez só (FE-20)', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    fake.open()
    await connected

    for (let i = 0; i < 3; i++) {
      fake.drop()
      fake.subscriptions = [] // as assinaturas morrem com a conexão, como no broker de verdade
      fake.open()
    }
    expect(fake.subscriptions).toHaveLength(3)

    fake.deliver(
      '/topic/rooms/4821',
      JSON.stringify({ type: 'PHASE_CHANGE', payload: { phase: 'DRAFT' }, serverTime: 1 }),
    )
    expect(events).toHaveLength(1)

    const current = [...fake.subscriptions]
    connection.disconnect()
    current.forEach((s) => expect(s.unsubscribe).toHaveBeenCalledOnce())
  })

  it('servidor recusa a conexão (ex: token inválido): status de erro e connect rejeitado', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    fake.stompError('Token inválido')
    await expect(connected).rejects.toThrow('Token inválido')
    expect(statuses.at(-1)).toBe('ERROR')
  })

  it('erro STOMP depois de conectado vira um aviso para a tela', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    fake.open()
    await connected
    fake.stompError('Sessão expirada')
    expect(events.at(-1)).toMatchObject({
      type: 'ERROR',
      payload: { message: 'Sessão expirada' },
      local: true,
    })
  })

  it('sem resposta do servidor, o connect desiste depois do tempo limite', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    vi.advanceTimersByTime(5000)
    await expect(connected).rejects.toThrow(/Não foi possível conectar/)
  })

  it('desconectar cancela as assinaturas e desliga o cliente', async () => {
    const connection = setup()
    const connected = connection.connect('4821')
    fake.open()
    await connected
    const subscriptions = [...fake.subscriptions]

    connection.disconnect()
    expect(fake.active).toBe(false)
    subscriptions.forEach((s) => expect(s.unsubscribe).toHaveBeenCalled())
    expect(statuses.at(-1)).toBe('DISCONNECTED')
  })
})
