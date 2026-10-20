// Regras dos 4 campos do "Entrar com Código" (FE-06) [RN-HUB-01]. Sem React, para testar isolado.
import { ROOM_CODE_LENGTH } from '../constants/game'

export type CodeDigits = string[]

export const emptyDigits = (): CodeDigits => Array.from({ length: ROOM_CODE_LENGTH }, () => '')

/** Só dígitos 0–9: letras, espaços e traços somem ("48-21" → "4821") */
export const onlyDigits = (text: string) => text.replace(/\D/g, '')

/**
 * Escreve `text` a partir da casa `index` (digitação de 1 dígito ou colar "4821").
 * Devolve os dígitos novos e a casa que deve receber o foco.
 */
export function fillDigits(
  digits: CodeDigits,
  index: number,
  text: string,
): { digits: CodeDigits; focus: number } {
  const incoming = onlyDigits(text).slice(0, ROOM_CODE_LENGTH - index)
  if (!incoming) return { digits, focus: index }
  const next = [...digits]
  for (let i = 0; i < incoming.length; i++) next[index + i] = incoming[i]
  return { digits: next, focus: Math.min(index + incoming.length, ROOM_CODE_LENGTH - 1) }
}

/** Backspace: apaga a casa atual; se já estava vazia, apaga a anterior e volta o foco para ela */
export function eraseDigit(
  digits: CodeDigits,
  index: number,
): { digits: CodeDigits; focus: number } {
  const next = [...digits]
  if (next[index]) {
    next[index] = ''
    return { digits: next, focus: index }
  }
  const previous = Math.max(index - 1, 0)
  next[previous] = ''
  return { digits: next, focus: previous }
}

/** ENTRAR só habilita com as 4 casas preenchidas [RN-HUB-01] */
export const isCodeComplete = (digits: CodeDigits) =>
  digits.length === ROOM_CODE_LENGTH && digits.every((d) => /^\d$/.test(d))
