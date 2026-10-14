import { ROOM_CODE_LENGTH } from '../constants/game'

const ROOM_CODE_PATTERN = new RegExp(`^\\d{${ROOM_CODE_LENGTH}}$`)

/** Código de sala: exatamente 4 dígitos numéricos [RF-SAL-01] */
export function isValidRoomCode(code: string | undefined | null): code is string {
  return typeof code === 'string' && ROOM_CODE_PATTERN.test(code)
}
