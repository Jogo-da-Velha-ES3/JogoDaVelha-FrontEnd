import { describe, expect, it } from 'vitest'
import { parseServerMessage } from './envelope'

describe('parseServerMessage', () => {
  it('aceita o envelope combinado', () => {
    expect(
      parseServerMessage('{"type":"BOARD_UPDATE","payload":{"board":[]},"serverTime":10}'),
    ).toEqual({ type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 10 })
  })

  it('aceita o GameMessage atual do back (timestamp no lugar de serverTime)', () => {
    expect(parseServerMessage('{"type":"PLAYER_JOINED","payload":{},"timestamp":20}')).toEqual({
      type: 'PLAYER_JOINED',
      payload: {},
      serverTime: 20,
    })
  })

  it('erro no formato do REST vira ERROR, aceitando a frase em "error"', () => {
    const envelope = parseServerMessage(
      '{"code":"BAD_REQUEST","error":"Bad Request","status":400,"timestamp":"2026-10-15T12:00:00Z"}',
      5,
    )
    expect(envelope).toEqual({
      type: 'ERROR',
      payload: { code: 'BAD_REQUEST', message: 'Bad Request' },
      serverTime: Date.parse('2026-10-15T12:00:00Z'),
    })
  })

  it('ignora o que não dá para entender', () => {
    expect(parseServerMessage('não é JSON')).toBeNull()
    expect(parseServerMessage('[1,2]')).toBeNull()
    expect(parseServerMessage('{"payload":{}}')).toBeNull()
  })

  it('sem horário do servidor, usa a hora de chegada', () => {
    expect(parseServerMessage('{"type":"BOARD_UPDATE","payload":{}}', 77)?.serverTime).toBe(77)
  })
})
