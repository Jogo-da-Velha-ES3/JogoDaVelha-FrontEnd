import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServerEnvelope } from '../../types/events'
import type { ConnectionStatus } from '../types'
import { MockConnection } from './mockConnection'
import { MOCK_TIMINGS } from './mockServer'

const NET = 200

async function setup() {
  const connection = new MockConnection()
  const events: ServerEnvelope[] = []
  const statuses: ConnectionStatus[] = []
  connection.onEvent((e) => events.push(e))
  connection.onStatus((s) => statuses.push(s))
  const connected = connection.connect('4821')
  await vi.advanceTimersByTimeAsync(NET)
  await connected
  return { connection, events, statuses }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MockConnection: a sua queda (FE-20)', () => {
  it('reconectando, intenção vira aviso local, o que o servidor manda se perde e a volta traz o snapshot', async () => {
    const { connection, events, statuses } = await setup()
    await vi.advanceTimersByTimeAsync(NET)
    expect(events.map((e) => e.type)).toEqual(['ROOM_SNAPSHOT'])

    connection.simulateDrop(2000)
    expect(statuses.at(-1)).toBe('RECONNECTING')

    connection.send({ type: 'MOVE', payload: { cell: 0 } })
    expect(events.at(-1)).toMatchObject({
      type: 'ERROR',
      payload: { code: 'NOT_CONNECTED' },
      local: true,
    })

    // O bot entra durante a queda: o PLAYER_JOINED não chega
    await vi.advanceTimersByTimeAsync(MOCK_TIMINGS.botJoin)
    expect(events.some((e) => e.type === 'PLAYER_JOINED')).toBe(false)

    // Volta antes do fim do MATCH FEITO (3s): o snapshot mostra a sala com os dois
    await vi.advanceTimersByTimeAsync(1000)
    expect(statuses.at(-1)).toBe('CONNECTED')
    const snapshot = events.findLast((e) => e.type === 'ROOM_SNAPSHOT')
    expect(snapshot?.payload).toMatchObject({ phase: 'MATCHED' })
    expect(snapshot?.payload).toHaveProperty('players.length', 2)
  })

  it('sair da sala durante a queda não reconecta depois', async () => {
    const { connection, statuses } = await setup()
    connection.simulateDrop(1000)
    connection.disconnect()
    await vi.advanceTimersByTimeAsync(2000)
    expect(statuses.at(-1)).toBe('DISCONNECTED')
  })
})
