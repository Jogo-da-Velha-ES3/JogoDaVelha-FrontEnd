import { describe, expect, it } from 'vitest'
import {
  emptyDigits,
  eraseDigit,
  fillDigits,
  isCodeComplete,
  onlyDigits,
  typedText,
} from './roomCodeInput'

describe('onlyDigits', () => {
  it('descarta tudo que não é número', () => {
    expect(onlyDigits(' 48-2a1 ')).toBe('4821')
  })
})

describe('fillDigits', () => {
  it('digitar um número preenche a casa e avança o foco', () => {
    const { digits, focus } = fillDigits(emptyDigits(), 0, '4')
    expect(digits).toEqual(['4', '', '', ''])
    expect(focus).toBe(1)
  })

  it('colar "4821" na primeira casa preenche as 4', () => {
    const { digits, focus } = fillDigits(emptyDigits(), 0, '4821')
    expect(digits).toEqual(['4', '8', '2', '1'])
    expect(focus).toBe(3)
  })

  it('colar no meio só preenche até o fim e ignora o excesso', () => {
    const { digits } = fillDigits(['9', '', '', ''], 2, '12345')
    expect(digits).toEqual(['9', '', '1', '2'])
  })

  it('letra não muda nada', () => {
    const start = ['1', '', '', '']
    expect(fillDigits(start, 1, 'a')).toEqual({ digits: start, focus: 1 })
  })
})

describe('typedText', () => {
  it('casa vazia: o que chegou entra inteiro (digitação ou preenchimento automático)', () => {
    expect(typedText('', '4')).toBe('4')
    expect(typedText('', '4821')).toBe('4821')
  })

  it('casa preenchida: fica só o dígito novo, com o cursor antes ou depois do antigo', () => {
    expect(typedText('4', '48')).toBe('8')
    expect(typedText('4', '84')).toBe('8')
    expect(typedText('4', '44')).toBe('4')
  })

  it('código inteiro numa casa preenchida continua inteiro', () => {
    expect(typedText('9', '4821')).toBe('4821')
  })
})

describe('eraseDigit', () => {
  it('apaga a casa atual quando ela tem número', () => {
    expect(eraseDigit(['1', '2', '', ''], 1)).toEqual({ digits: ['1', '', '', ''], focus: 1 })
  })

  it('na casa vazia, volta e apaga a anterior', () => {
    expect(eraseDigit(['1', '2', '', ''], 2)).toEqual({ digits: ['1', '', '', ''], focus: 1 })
  })

  it('na primeira casa vazia, fica nela', () => {
    expect(eraseDigit(emptyDigits(), 0)).toEqual({ digits: emptyDigits(), focus: 0 })
  })
})

describe('isCodeComplete', () => {
  it('exige os 4 dígitos', () => {
    expect(isCodeComplete(['4', '8', '2', '1'])).toBe(true)
    expect(isCodeComplete(['4', '8', '2', ''])).toBe(false)
  })
})
