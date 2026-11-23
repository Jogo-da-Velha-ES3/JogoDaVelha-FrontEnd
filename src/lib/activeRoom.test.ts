import { describe, expect, it } from 'vitest'
import { activeRoomLeaveConsequence, activeRoomMoment, parseActiveRoom } from './activeRoom'

describe('parseActiveRoom (corpo do GET /rooms/active)', () => {
  it('lê código, fase e canReturn', () => {
    expect(parseActiveRoom({ code: '0042', phase: 'DRAFT', canReturn: true })).toEqual({
      code: '0042',
      phase: 'DRAFT',
      canReturn: true,
    })
  })

  it('fase desconhecida ou ausente fica em branco, sem perder a sala', () => {
    expect(parseActiveRoom({ code: '0042', phase: 'VERSUS', canReturn: false })).toEqual({
      code: '0042',
      phase: null,
      canReturn: false,
    })
    expect(parseActiveRoom({ code: '0042', canReturn: true })?.phase).toBeNull()
  })

  it.each([
    ['null', null],
    ['texto', 'sala 0042'],
    ['lista', [{ code: '0042', canReturn: true }]],
    ['sem código', { phase: 'DRAFT', canReturn: true }],
    ['código numérico', { code: 42, canReturn: true }],
    ['código de 5 dígitos', { code: '00420', canReturn: true }],
    ['canReturn em texto', { code: '0042', canReturn: 'true' }],
    ['sem canReturn', { code: '0042', phase: 'DRAFT' }],
  ])('%s: resposta inesperada vira null', (_, data) => {
    expect(parseActiveRoom(data)).toBeNull()
  })
})

describe('activeRoomMoment', () => {
  it.each([
    ['WAITING', 'WAITING'],
    ['MATCHED', 'PREPARATION'],
    ['DRAFT', 'PREPARATION'],
    ['PLAYING', 'MATCH'],
    ['RESULT', 'RESULT'],
    [null, 'OTHER'],
  ] as const)('%s → %s', (phase, moment) => {
    expect(activeRoomMoment(phase)).toBe(moment)
  })
})

describe('activeRoomLeaveConsequence (confirmação antes de sair pelo Hub)', () => {
  it.each([
    ['WAITING', null],
    ['MATCHED', 'CLOSE_ROOM'],
    ['DRAFT', 'CLOSE_ROOM'],
    ['PLAYING', 'FORFEIT'],
    ['RESULT', null],
    // Pode haver alguém na sala: confirma como se fosse fechar
    [null, 'CLOSE_ROOM'],
  ] as const)('%s → %s', (phase, consequence) => {
    expect(activeRoomLeaveConsequence(phase)).toBe(consequence)
  })
})
