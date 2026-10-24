// Modal "Esqueci minha senha" (FE-36): o jogador informa o e-mail e pede o link de recuperação.
// Modal curto colado no alto, como o "Entrar com Código" (FE-06): campo e botão numa linha, acima
// do teclado, e o erro em vermelho embaixo [PROJECT_CONTEXT §3 e §9].
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { forgotPassword, forgotPasswordErrorFor } from '../../api/auth'
import { Button, Modal } from '../../components/ui'
import { EMAIL_MAX, validateEmail } from '../../lib/authValidation'
import { FormError, TextField } from './FormFields'

/** Sempre este texto, exista o e-mail ou não: o pedido nunca revela se a conta existe */
export const FORGOT_PASSWORD_SENT_MESSAGE =
  'Se esse e-mail estiver cadastrado, você vai receber um link para criar uma senha nova.'

interface ForgotPasswordModalProps {
  open: boolean
  onClose: () => void
}

export function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Esqueci minha senha" size="md" placement="top">
      {/* Montado só enquanto aberto: reabrir começa com o campo vazio, sem erro nem confirmação */}
      {open && <ForgotPasswordForm onClose={onClose} />}
    </Modal>
  )
}

function ForgotPasswordForm({ onClose }: { onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const sentRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => formRef.current?.querySelector('input')?.focus(), [])
  // O formulário some com o envio: o foco vai para o botão de fechar, não se perde
  useEffect(() => {
    if (sent) sentRef.current?.querySelector('button')?.focus()
  }, [sent])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const invalid = validateEmail(email)
    setEmailError(invalid ?? undefined)
    setFormError(null)
    if (invalid) return

    setPending(true)
    try {
      await forgotPassword(email)
      // Só confirma depois da resposta do servidor (nada otimista)
      setSent(true)
    } catch (error) {
      // O que foi digitado fica: o jogador tenta de novo sem redigitar
      setFormError(forgotPasswordErrorFor(error).form)
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div ref={sentRef} className="flex flex-col gap-3 pb-1 short:gap-2">
        <p role="status" className="text-base text-text">
          {FORGOT_PASSWORD_SENT_MESSAGE}
        </p>
        <Button block onClick={onClose} className="short:w-auto short:self-end">
          Fechar
        </Button>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-2 pb-1"
    >
      <p className="text-sm">Informe o e-mail da sua conta para receber o link.</p>
      {/* Celular deitado: campo e botão na mesma linha, acima do teclado */}
      <div className="flex flex-col gap-3 short:flex-row short:items-start short:gap-2">
        <div className="short:flex-1">
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={EMAIL_MAX}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={emailError}
          />
        </div>
        {/* No celular deitado o botão fica alinhado com o campo, abaixo do rótulo */}
        <Button type="submit" block disabled={pending} className="short:mt-5 short:w-auto">
          {pending ? 'Enviando…' : 'Enviar link'}
        </Button>
      </div>
      <FormError message={formError} />
    </form>
  )
}
