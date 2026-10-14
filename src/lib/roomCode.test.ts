import { describe, expect, it } from 'vitest'
import { isValidRoomCode } from './roomCode'

describe('isValidRoomCode', () => {
  it.each(['4821', '0000', '9999'])('aceita %s', (code) => {
    expect(isValidRoomCode(code)).toBe(true)
  })

  it.each(['', '482', '48210', 'abcd', '48a1', ' 4821', '4821 ', '４８２１'])(
    'rejeita "%s"',
    (code) => {
      expect(isValidRoomCode(code)).toBe(false)
    },
  )

  it('rejeita ausência de código', () => {
    expect(isValidRoomCode(undefined)).toBe(false)
    expect(isValidRoomCode(null)).toBe(false)
  })
})
