import { describe, expect, it } from 'vitest'
import { BACK_MESSAGES as M } from './__fixtures__/backMessages'
import { parseServerMessage } from './envelope'

const parse = (body: string) => parseServerMessage(body, 1)

describe('parseServerMessage', () => {
  it('aceita o envelope do back', () => {
    expect(
      parseServerMessage('{"type":"BOARD_UPDATE","payload":{"board":[]},"serverTime":10}'),
    ).toEqual({ type: 'BOARD_UPDATE', payload: { board: [] }, serverTime: 10 })
  })

  it('aceita o GameMessage antigo (timestamp no lugar de serverTime)', () => {
    expect(parseServerMessage('{"type":"PHASE_CHANGE","payload":{},"timestamp":20}')).toEqual({
      type: 'PHASE_CHANGE',
      payload: {},
      serverTime: 20,
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

describe('tradução das mensagens reais do back (contrato V2)', () => {
  it('snapshot: vale o privado; o público (sem mySlot) é descartado', () => {
    expect(parse(M.privateSnapshot)?.payload).toMatchObject({ code: '1171', mySlot: 'P1' })
    expect(parse(M.publicSnapshot)).toBeNull()
  })

  it('PLAYER_JOINED vira o jogador P2 no formato do front', () => {
    expect(parse(M.playerJoined)).toEqual({
      type: 'PLAYER_JOINED',
      payload: {
        player: {
          slot: 'P2',
          userId: '717adadb-ca2f-452b-ba67-f6b13b87c239',
          nickname: 'smokeguest16109',
          character: null,
          roundsWon: 0,
          consecutiveTimeouts: 0,
          forceFieldTurnsLeft: 0,
          silenced: false,
          connected: true,
        },
      },
      serverTime: 1793935922484,
    })
  })

  it('ROUND_START: firstPlayer vira startingPlayer', () => {
    expect(parse(M.roundStart)?.payload).toEqual({
      round: 1,
      startingPlayer: 'P1',
      suddenDeath: false,
    })
  })

  it('TURN_START chega com estouros e Silêncio oficiais', () => {
    expect(parse(M.turnStart)?.payload).toEqual({
      player: 'P1',
      startedAt: 1793935931317,
      durationSeconds: 10,
      consecutiveTimeouts: { P1: 0, P2: 0 },
      silenced: { P1: false, P2: false },
    })
  })

  it('ABILITY_RESOLVED: nomes do front e casas nulas quando a habilidade não tem alvo', () => {
    expect(parse(M.abilityTornado)?.payload).toEqual({
      by: 'P2',
      ability: 'TORNADO',
      targetCell: 5,
      destinationCell: 10,
      absorbed: false,
      noEffect: false,
    })
    expect(parse(M.abilityHourglass)?.payload).toEqual({
      by: 'P1',
      ability: 'AMPULHETA',
      targetCell: null,
      destinationCell: null,
      absorbed: false,
      noEffect: false,
    })
  })

  it('ROUND_END: o empate vem sem winningLine e vira null', () => {
    expect(parse(M.roundEndWin)?.payload).toMatchObject({ winner: 'P1', winningLine: [0, 1, 2, 3] })
    expect(parse(M.roundEndDraw)?.payload).toEqual({
      round: 1,
      winner: null,
      winningLine: null,
      score: { P1: 0, P2: 0 },
    })
  })

  it('DRAFT_UPDATE, MATCH_END e ROOM_CLOSED passam como vieram', () => {
    expect(parse(M.draftUpdate)?.payload).toMatchObject({ characters: { P1: 'X' }, version: 1 })
    expect(parse(M.matchEnd)?.payload).toMatchObject({
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
      coins: { P1: 50, P2: 10 },
    })
    expect(parse(M.roomClosed)?.payload).toMatchObject({ reason: 'PLAYER_LEFT' })
  })

  it('erro da fila de erros vira ERROR com o código do back', () => {
    expect(parse(M.error)).toEqual({
      type: 'ERROR',
      payload: { code: 'ROOM_NOT_FOUND', message: 'Sala não encontrada ou encerrada.' },
      serverTime: Date.parse('2026-11-06T03:33:16.211274Z'),
    })
  })

  it('erro sem mensagem usa a frase HTTP de "error"', () => {
    const envelope = parseServerMessage(
      '{"code":"ROOM_CONFLICT","error":"Conflict","status":409}',
      5,
    )
    expect(envelope).toEqual({
      type: 'ERROR',
      payload: { code: 'ROOM_CONFLICT', message: 'Conflict' },
      serverTime: 5,
    })
  })
})
