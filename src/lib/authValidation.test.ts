import { describe, expect, it } from 'vitest'
import {
  hasErrors,
  validateEmail,
  validateLogin,
  validateNewPassword,
  validateRegister,
  validateUsername,
} from './authValidation'

describe('validateUsername', () => {
  it('aceita de 3 a 15 caracteres', () => {
    expect(validateUsername('abc')).toBeNull()
    expect(validateUsername('a'.repeat(15))).toBeNull()
  })

  it('recusa vazio, curto e longo', () => {
    expect(validateUsername('   ')).toMatch(/Informe/)
    expect(validateUsername('ab')).toMatch(/3 a 15/)
    expect(validateUsername('a'.repeat(16))).toMatch(/3 a 15/)
  })
})

describe('validateEmail', () => {
  it('aceita e-mail com domínio e TLD', () => {
    expect(validateEmail('vini@fatec.sp.gov.br')).toBeNull()
  })

  it('recusa sem TLD ou sem @, como o back', () => {
    expect(validateEmail('vini@fatec')).toBe('E-mail inválido.')
    expect(validateEmail('vini.fatec.com')).toBe('E-mail inválido.')
    expect(validateEmail('')).toMatch(/Informe/)
  })
})

describe('validateNewPassword', () => {
  it('exige de 6 a 72 caracteres', () => {
    expect(validateNewPassword('123456')).toBeNull()
    expect(validateNewPassword('12345')).toMatch(/6 a 72/)
    expect(validateNewPassword('a'.repeat(73))).toMatch(/6 a 72/)
  })
})

describe('validateLogin', () => {
  it('só exige os dois campos preenchidos', () => {
    expect(validateLogin({ identifier: 'vini', password: '1' })).toEqual({})
    const errors = validateLogin({ identifier: ' ', password: '' })
    expect(Object.keys(errors)).toEqual(['identifier', 'password'])
  })
})

describe('validateRegister', () => {
  it('junta os erros de cada campo', () => {
    const errors = validateRegister({ username: 'ab', email: 'x', password: '1' })
    expect(Object.keys(errors)).toEqual(['username', 'email', 'password'])
    expect(hasErrors(errors)).toBe(true)
  })

  it('sem erros quando tudo está certo', () => {
    const errors = validateRegister({
      username: 'vini',
      email: 'vini@exemplo.com',
      password: '123456',
    })
    expect(hasErrors(errors)).toBe(false)
  })
})
