// Validação da tela de Acesso (FE-25), espelhando as regras do back (RegisterRequest/LoginRequest).
// O servidor valida de novo; aqui é só para o erro aparecer na hora, sem ida e volta.
import { ACCESS_TEXTS } from '../constants/texts'

const V = ACCESS_TEXTS.validation

export const USERNAME_MIN = 3
export const USERNAME_MAX = 15
export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 72
export const EMAIL_MAX = 254

// Mesmo padrão do @Pattern do back: domínio com TLD de pelo menos 2 letras
const EMAIL_PATTERN = /^[\w.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export type LoginField = 'identifier' | 'password'
export type RegisterField = 'username' | 'email' | 'password'
export type FieldErrors<F extends string> = Partial<Record<F, string>>

export interface LoginInput {
  identifier: string
  password: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export function validateUsername(value: string): string | null {
  const username = value.trim()
  if (!username) return V.usernameRequired
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return V.usernameLength(USERNAME_MIN, USERNAME_MAX)
  }
  return null
}

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return V.emailRequired
  if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) return V.emailInvalid
  return null
}

export function validateNewPassword(value: string): string | null {
  if (!value) return V.passwordRequired
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    return V.passwordLength(PASSWORD_MIN, PASSWORD_MAX)
  }
  return null
}

/** No login só exige preenchido: quem decide se a senha está certa é o servidor */
export function validateLogin(input: LoginInput): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {}
  const identifier = input.identifier.trim()
  if (!identifier) errors.identifier = V.identifierRequired
  else if (identifier.length > EMAIL_MAX) errors.identifier = V.identifierTooLong
  if (!input.password) errors.password = V.loginPasswordRequired
  return errors
}

export function validateRegister(input: RegisterInput): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {}
  const username = validateUsername(input.username)
  const email = validateEmail(input.email)
  const password = validateNewPassword(input.password)
  if (username) errors.username = username
  if (email) errors.email = email
  if (password) errors.password = password
  return errors
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0

// Recuperação de senha (FE-36): tela "Nova senha" / "Confirmar nova senha"
export type ResetPasswordField = 'password' | 'confirm'

export interface ResetPasswordInput {
  password: string
  confirm: string
}

/** Senha nova com as mesmas regras do cadastro (6 a 72) e confirmação igual à senha */
export function validateResetPassword(input: ResetPasswordInput): FieldErrors<ResetPasswordField> {
  const errors: FieldErrors<ResetPasswordField> = {}
  const password = validateNewPassword(input.password)
  if (password) errors.password = password
  if (input.confirm !== input.password) errors.confirm = V.passwordsDiffer
  return errors
}
