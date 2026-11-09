import { describe, expect, it } from 'vitest'
import { toBackCommand } from './destinations'

const body = (value: string) => JSON.parse(value) as unknown

describe('toBackCommand — intenções no formato do back', () => {
  it('jogada manda a posição', () => {
    const command = toBackCommand('4821', { type: 'MOVE', payload: { cell: 5 } })
    expect(command.destination).toBe('/app/rooms/4821/move')
    expect(body(command.body)).toEqual({ position: 5 })
  })

  it('habilidade manda skillCode e as posições, só as que existem', () => {
    const tornado = toBackCommand('4821', {
      type: 'USE_ABILITY',
      payload: { ability: 'TORNADO', targetCell: 5, destinationCell: 10 },
    })
    expect(tornado.destination).toBe('/app/rooms/4821/ability')
    expect(body(tornado.body)).toEqual({
      skillCode: 'TORNADO',
      targetPosition: 5,
      destinationPosition: 10,
    })

    const hourglass = toBackCommand('4821', {
      type: 'USE_ABILITY',
      payload: { ability: 'AMPULHETA' },
    })
    expect(body(hourglass.body)).toEqual({ skillCode: 'AMPULHETA' })
  })

  it('aceitar e recusar a revanche são destinos diferentes, sem corpo', () => {
    expect(toBackCommand('4821', { type: 'REMATCH_RESPOND', payload: { accept: true } })).toEqual({
      destination: '/app/rooms/4821/rematch/accept',
      body: '{}',
    })
    expect(toBackCommand('4821', { type: 'REMATCH_RESPOND', payload: { accept: false } })).toEqual({
      destination: '/app/rooms/4821/rematch/decline',
      body: '{}',
    })
  })

  it('Preparação, sorteio, pedido de revanche e saída', () => {
    const at = (path: string) => `/app/rooms/4821${path}`
    expect(
      toBackCommand('4821', { type: 'DRAFT_CHARACTER', payload: { character: 'ESTRELA' } }),
    ).toEqual({ destination: at('/draft/character'), body: '{"character":"ESTRELA"}' })
    expect(
      toBackCommand('4821', {
        type: 'DRAFT_ABILITIES',
        payload: { abilities: ['BOMBA', 'ESCUDO'] },
      }),
    ).toEqual({ destination: at('/draft/abilities'), body: '{"abilities":["BOMBA","ESCUDO"]}' })
    expect(toBackCommand('4821', { type: 'DRAW_PICK', payload: { ability: 'TORNADO' } })).toEqual({
      destination: at('/draw/pick'),
      body: '{"ability":"TORNADO"}',
    })
    // Do round 2 em diante: a carta nova e a habilidade do deck que sai
    expect(
      toBackCommand('4821', {
        type: 'DRAW_PICK',
        payload: { ability: 'TORNADO', abilityToRemove: 'ESCUDO' },
      }),
    ).toEqual({
      destination: at('/draw/pick'),
      body: '{"ability":"TORNADO","abilityToRemove":"ESCUDO"}',
    })
    expect(toBackCommand('4821', { type: 'REMATCH_REQUEST', payload: {} }).destination).toBe(
      at('/rematch/request'),
    )
    expect(toBackCommand('4821', { type: 'LEAVE', payload: {} }).destination).toBe(at('/leave'))
  })
})
