import { describe, expect, it } from 'vitest'
import { ROOM_TEXTS } from '../constants/texts'
import type { RoomPhase } from '../types/game'
import { type RoomError, roomErrorMessage } from './roomErrors'

const T = ROOM_TEXTS.actionErrors
const generic: Omit<RoomError, 'command'> = {
  code: 'ROOM_CONFLICT',
  message: 'A ação não pode ser realizada no estado atual.',
}
const at = (phase: RoomPhase | null, rematchShown = false) => ({ phase, rematchShown })

describe('roomErrorMessage (SUG-02)', () => {
  it('jogada ou habilidade fora do turno em jogo pede para esperar o round', () => {
    for (const phase of ['VERSUS', 'ROUND_DRAW', 'ROUND_END'] as const) {
      expect(roomErrorMessage({ ...generic, command: 'MOVE' }, at(phase))).toBe(T.waitRound)
      expect(roomErrorMessage({ ...generic, command: 'USE_ABILITY' }, at(phase))).toBe(T.waitRound)
    }
    // O back também recusa pelo código quando o round acabou ou o sorteio não terminou
    const late = {
      code: 'ROUND_FINISHED',
      message: 'O round já terminou.',
      command: 'MOVE',
    } as const
    expect(roomErrorMessage(late, at('PLAYING'))).toBe(T.waitRound)
  })

  it('em jogo, explica a vez e o tempo; o resto do back passa como veio', () => {
    const move = (code: string, message = 'x') => ({ code, message, command: 'MOVE' }) as const
    expect(roomErrorMessage(move('NOT_YOUR_TURN'), at('PLAYING'))).toBe(T.notYourTurn)
    expect(roomErrorMessage(move('TURN_EXPIRED'), at('PLAYING'))).toBe(T.turnOver)
    expect(roomErrorMessage({ ...generic, command: 'MOVE' }, at('PLAYING'))).toBe(T.notNow)
    expect(
      roomErrorMessage(move('POSITION_OCCUPIED', 'A casa já está ocupada.'), at('PLAYING')),
    ).toBe('A casa já está ocupada.')
  })

  it('1 jogada e 1 habilidade por turno, e passar a vez só depois de agir (BE-046)', () => {
    const error = (code: string, command: 'MOVE' | 'USE_ABILITY' | 'END_TURN') =>
      roomErrorMessage({ code, message: 'x', command }, at('PLAYING'))
    expect(error('MOVE_ALREADY_USED', 'MOVE')).toBe(T.moveAlreadyUsed)
    expect(error('SKILL_ACTION_ALREADY_USED', 'USE_ABILITY')).toBe(T.abilityAlreadyUsed)
    expect(error('END_TURN_WITHOUT_ACTION', 'END_TURN')).toBe(T.endTurnWithoutAction)
    expect(error('NOT_YOUR_TURN', 'END_TURN')).toBe(T.notYourTurn)
    // O back responde ao "Passar a vez" fora da vez com FORBIDDEN e, sem prazo, com o genérico
    expect(error('FORBIDDEN', 'END_TURN')).toBe(T.notYourTurn)
    expect(error('ROOM_CONFLICT', 'END_TURN')).toBe(T.turnOver)
    expect(error('ROOM_CONFLICT', 'MOVE')).toBe(T.notNow)
  })

  it('sorteio e Preparação: o tempo acabou quando a fase já passou', () => {
    expect(roomErrorMessage({ ...generic, command: 'DRAW_PICK' }, at('PLAYING'))).toBe(T.drawOver)
    expect(roomErrorMessage({ ...generic, command: 'DRAW_PICK' }, at('ROUND_DRAW'))).toBe(T.notNow)
    expect(roomErrorMessage({ ...generic, command: 'DRAFT_ABILITIES' }, at('VERSUS'))).toBe(
      T.draftOver,
    )
    expect(roomErrorMessage({ ...generic, command: 'DRAFT_CHARACTER' }, at('DRAFT'))).toBe(T.notNow)
  })

  it('revanche: sem aviso quando o painel já mostra o que aconteceu', () => {
    expect(roomErrorMessage({ ...generic, command: 'REMATCH_REQUEST' }, at('RESULT', true))).toBe(
      null,
    )
    expect(roomErrorMessage({ ...generic, command: 'REMATCH_RESPOND' }, at('RESULT'))).toBe(
      T.notNow,
    )
    expect(roomErrorMessage({ ...generic, command: 'LEAVE' }, at('PLAYING'))).toBeNull()
  })

  it('sem ação conhecida (erro local, conexão), a mensagem passa como veio', () => {
    const local = { code: 'NOT_CONNECTED', message: 'Sem conexão com a sala.' }
    expect(roomErrorMessage(local, at('PLAYING'))).toBe('Sem conexão com a sala.')
  })
})
