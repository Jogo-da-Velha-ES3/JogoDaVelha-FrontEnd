// Tela "Nova senha" (FE-36), aberta pelo link do e-mail: Nova senha + Confirmar nova senha.
// Mesmo padrão do Acesso (aba "Criar conta" do esboço): em paisagem, campos e botão numa linha só,
// no alto, para o teclado não cobrir [PROJECT_CONTEXT §3 e §9].
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetPassword, resetPasswordErrorFor } from '../../api/auth'
import { Button } from '../../components/ui'
import {
  hasErrors,
  PASSWORD_MAX,
  validateResetPassword,
  type FieldErrors,
  type ResetPasswordField,
} from '../../lib/authValidation'
import { PATHS } from '../../routes/paths'
import { showToast } from '../../stores/toastStore'
import { FormError, TextField } from './FormFields'

const INVALID_LINK_MESSAGE = 'Esse link expirou ou não é válido. Peça um novo.'
export const PASSWORD_CHANGED_MESSAGE = 'Senha alterada! Entre com a senha nova.'

/** `token` é o que veio no link; vazio = link sem token, que já cai direto no link inválido */
export function ResetPasswordScreen({ token }: { token: string }) {
  const [invalidLink, setInvalidLink] = useState(() => !token.trim())

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 py-4 short:max-w-3xl short:justify-start short:gap-2 short:py-1">
      <h1 className="font-display text-3xl leading-none font-extrabold tracking-wide text-primary uppercase short:text-2xl">
        Nova senha
      </h1>
      {invalidLink ? (
        <InvalidLink />
      ) : (
        <ResetPasswordForm token={token} onInvalidLink={() => setInvalidLink(true)} />
      )}
    </section>
  )
}

/** Sem formulário: o link não serve mais. O pedido de outro link é pelo "Esqueci minha senha" */
function InvalidLink() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-3 short:flex-row short:items-center short:gap-4">
      <div className="flex-1">
        <FormError message={INVALID_LINK_MESSAGE} />
      </div>
      <Button block className="short:w-auto" onClick={() => navigate(PATHS.access)}>
        Voltar ao Acesso
      </Button>
    </div>
  )
}

function ResetPasswordForm({ token, onInvalidLink }: { token: string; onInvalidLink: () => void }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors<ResetPasswordField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    // Senha curta ou confirmação diferente: o erro aparece aqui, o back nem é chamado
    const local = validateResetPassword({ password, confirm })
    setErrors(local)
    setFormError(null)
    if (hasErrors(local)) return

    setPending(true)
    try {
      await resetPassword(token, password)
      // Só depois da resposta de sucesso (nada otimista)
      showToast({ message: PASSWORD_CHANGED_MESSAGE })
      navigate(PATHS.access)
    } catch (error) {
      const result = resetPasswordErrorFor(error)
      if (result.invalidLink) {
        onInvalidLink()
        return
      }
      // O que foi digitado fica: o jogador tenta de novo sem redigitar
      setErrors(result.fields)
      setFormError(result.form)
      setPending(false)
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-2">
      {/* Celular deitado: as duas senhas e o botão numa linha só, acima do teclado */}
      <div className="grid items-start gap-3 short:grid-cols-[1fr_1fr_auto] short:gap-2">
        <TextField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <TextField
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.confirm}
        />
        {/* No celular deitado o botão fica alinhado com os campos (abaixo do rótulo) */}
        <Button type="submit" block disabled={pending} className="short:mt-5 short:w-auto">
          {pending ? 'Salvando…' : 'Salvar senha'}
        </Button>
      </div>
      <FormError message={formError} />
    </form>
  )
}
