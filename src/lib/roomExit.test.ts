import { describe, expect, it } from 'vitest'
import { leaveConsequence } from './roomExit'

describe('leaveConsequence (FRT-03)', () => {
  it('na partida, sair é desistência (W.O. para o oponente)', () => {
    for (const phase of ['VERSUS', 'ROUND_DRAW', 'PLAYING', 'ROUND_END'] as const) {
      expect(leaveConsequence(phase)).toBe('FORFEIT')
    }
  })

  it('no Match feito e na Preparação, sair fecha a sala sem partida', () => {
    expect(leaveConsequence('MATCHED')).toBe('CLOSE_ROOM')
    expect(leaveConsequence('DRAFT')).toBe('CLOSE_ROOM')
  })

  it('na Sala de Espera, no Resultado e ainda entrando, sair não custa nada ao outro', () => {
    expect(leaveConsequence('WAITING')).toBeNull()
    expect(leaveConsequence('RESULT')).toBeNull()
    expect(leaveConsequence(null)).toBeNull()
  })
})
