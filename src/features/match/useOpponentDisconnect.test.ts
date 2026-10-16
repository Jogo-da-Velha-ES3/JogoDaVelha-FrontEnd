import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import type { ServerEvent } from '../../types/events'
import type { PlayerSlot, PlayerState } from '../../types/game'
import { useOpponentDisconnect } from './useOpponentDisconnect'

function send<T extends ServerEvent['type']>(
  type: T,
  payload: Extract<ServerEvent, { type: T }>['payload'],
) {
  act(() => applyServerEvent({ type, payload, serverTime: Date.now() } as never))
}

const player = (slot: PlayerSlot): PlayerState => ({
  slot,
  userId: `u-${slot}`,
  nickname: slot,
  character: null,
  roundsWon: 0,
  consecutiveTimeouts: 0,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
})

beforeEach(() => {
  resetGameStores()
  send('PLAYER_JOINED', { player: player('P1') })
  send('PLAYER_JOINED', { player: player('P2') })
})

describe('useOpponentDisconnect', () => {
  it('oponente caído com os estouros dele, que vêm do servidor', () => {
    const { result } = renderHook(() => useOpponentDisconnect())
    expect(result.current).toEqual({ disconnected: false, consecutiveTimeouts: 0 })

    send('PLAYER_DISCONNECTED', { slot: 'P2' })
    send('TURN_TIMEOUT', { player: 'P2', consecutiveTimeouts: 1 })
    expect(result.current).toEqual({ disconnected: true, consecutiveTimeouts: 1 })

    send('PLAYER_RECONNECTED', { slot: 'P2' })
    expect(result.current.disconnected).toBe(false)
  })

  it('a minha queda não conta como oponente desconectado', () => {
    const { result } = renderHook(() => useOpponentDisconnect())
    send('PLAYER_DISCONNECTED', { slot: 'P1' })
    expect(result.current.disconnected).toBe(false)
  })
})
