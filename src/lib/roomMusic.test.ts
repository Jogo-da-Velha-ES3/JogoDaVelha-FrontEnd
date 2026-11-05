import { describe, expect, it } from 'vitest'
import type { RoomPhase } from '../types/game'
import { roomTrack } from './roomMusic'

describe('roomTrack (FE-38)', () => {
  it.each<RoomPhase>(['WAITING', 'MATCHED', 'DRAFT'])('%s: trilha da Sala', (phase) => {
    expect(roomTrack(phase, false)).toBe('trilha-sala')
  })

  it.each<RoomPhase>(['VERSUS', 'ROUND_DRAW', 'PLAYING', 'ROUND_END'])(
    '%s: trilha da Arena, e a acelerada na Morte Súbita',
    (phase) => {
      expect(roomTrack(phase, false)).toBe('trilha-arena')
      expect(roomTrack(phase, true)).toBe('trilha-morte-subita')
    },
  )

  it('Resultado: sem trilha (a vinheta é o efeito do MATCH_END), mesmo depois da Morte Súbita', () => {
    expect(roomTrack('RESULT', false)).toBeNull()
    expect(roomTrack('RESULT', true)).toBeNull()
  })
})
