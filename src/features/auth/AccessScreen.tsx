// Tela de Acesso (FE-25): Entrar (e-mail ou usuário + senha) e Criar conta.
// Paisagem: o teclado cobre a metade de baixo, então tudo fica no alto e compacto [PROJECT_CONTEXT §9].
import { useId, useState, type FormEvent } from 'react'
import {
  AccountCreatedError,
  login,
  loginErrorFor,
  register,
  registerErrorFor,
  type AuthSession,
} from '../../api/auth'
import { Button } from '../../components/ui'
import {
  EMAIL_MAX,
  hasErrors,
  PASSWORD_MAX,
  USERNAME_MAX,
  validateLogin,
  validateRegister,
  type FieldErrors,
  type LoginField,
  type RegisterField,
} from '../../lib/authValidation'
import { CHARACTER_INFO } from '../../constants/characters'
import { useAuthStore } from '../../stores/authStore'
import type { CharacterId } from '../../types/game'
import { Character } from '../characters'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { FormError, TextField } from './FormFields'

type Tab = 'login' | 'register'

// Ordem do CHARACTER_INFO: X, O, Triângulo, Quadrado, Estrela, Coração
const CHARACTER_IDS = Object.keys(CHARACTER_INFO) as CharacterId[]

/** Conta criada sem conseguir entrar: a aba Entrar abre com o usuário preenchido e um aviso */
interface CreatedAccount {
  username: string
}

// Layout do esboço (Tela 1 de 8): marca à esquerda, formulário à direita
export function AccessScreen() {
  const [tab, setTab] = useState<Tab>('login')
  const [created, setCreated] = useState<CreatedAccount | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const id = useId()
  const tabId = (t: Tab) => `${id}-aba-${t}`
  const panelId = `${id}-painel`

  function selectTab(next: Tab) {
    setCreated(null)
    setTab(next)
  }

  function handleAccountCreated(username: string) {
    setCreated({ username })
    setTab('login')
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-stretch gap-4 py-4 sm:flex-row sm:items-center sm:gap-8 short:items-start short:gap-4 short:py-1">
      {/* Criar conta com o celular deitado: a marca sai para a linha de campos caber acima do teclado */}
      <Brand hiddenWhenShort={tab === 'register'} />

      <div className="flex flex-1 flex-col gap-3 short:gap-2">
        <div
          role="tablist"
          aria-label="Acesso"
          className="grid grid-cols-2 gap-1 rounded-xl bg-bg-panel p-1"
        >
          <TabButton
            id={tabId('login')}
            panelId={panelId}
            active={tab === 'login'}
            onClick={() => selectTab('login')}
          >
            Entrar
          </TabButton>
          <TabButton
            id={tabId('register')}
            panelId={panelId}
            active={tab === 'register'}
            onClick={() => selectTab('register')}
          >
            Criar conta
          </TabButton>
        </div>

        <div id={panelId} role="tabpanel" aria-labelledby={tabId(tab)}>
          {/* key: trocar de aba começa o formulário do zero, sem erro antigo */}
          {tab === 'login' ? (
            <LoginForm key="login" created={created} onForgotPassword={() => setForgotOpen(true)} />
          ) : (
            <RegisterForm key="register" onAccountCreated={handleAccountCreated} />
          )}
        </div>
      </div>
      {/* Fora do <form> do LoginForm: um formulário dentro de outro não é HTML válido */}
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </section>
  )
}

function Brand({ hiddenWhenShort }: { hiddenWhenShort: boolean }) {
  return (
    <div
      className={[
        'flex flex-1 flex-col items-center gap-2 short:gap-1',
        hiddenWhenShort ? 'short:hidden' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        {/* Espaço do logo com a carinha do Vitão: a arte vem com a FE-41 (flag desligada) */}
        <div
          aria-hidden
          className="grid size-14 place-items-center rounded-full border-2 border-dashed border-line font-mono text-[10px] text-text-muted short:size-11"
        >
          logo
        </div>
        <h1 className="font-display text-3xl leading-none font-extrabold tracking-wide text-primary uppercase short:text-2xl">
          Jogo do
          <br />
          Velho
        </h1>
      </div>
      <div className="flex justify-center gap-1" aria-hidden>
        {CHARACTER_IDS.map((id) => (
          <Character key={id} id={id} decorative className="h-10 w-9 short:h-8 short:w-7" />
        ))}
      </div>
    </div>
  )
}

function TabButton({
  id,
  panelId,
  active,
  onClick,
  children,
}: {
  id: string
  panelId: string
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      onClick={onClick}
      className={[
        'min-h-10 rounded-lg font-display text-sm font-bold tracking-wide uppercase transition short:min-h-9',
        active
          ? 'bg-bg-raised text-primary shadow-glow shadow-primary/20'
          : 'text-text-muted hover:text-primary',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/** Guarda a sessão: a guarda RequireGuest leva sozinha ao Hub (ou à sala do link direto) */
function useStartSession() {
  const saveToken = useAuthStore((s) => s.login)
  return (session: AuthSession) => saveToken(session.token)
}

function LoginForm({
  created,
  onForgotPassword,
}: {
  created: CreatedAccount | null
  onForgotPassword: () => void
}) {
  const startSession = useStartSession()
  const [identifier, setIdentifier] = useState(created?.username ?? '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const local = validateLogin({ identifier, password })
    setErrors(local)
    setFormError(null)
    if (hasErrors(local)) return

    setPending(true)
    try {
      startSession(await login(identifier, password))
    } catch (error) {
      const result = loginErrorFor(error)
      setErrors(result.fields)
      setFormError(result.form)
      setPending(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3 short:gap-2">
      {created && !formError && (
        <p role="status" className="text-center text-sm text-primary">
          Conta criada! Agora é só entrar com sua senha.
        </p>
      )}
      <TextField
        label="E-mail ou usuário"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={EMAIL_MAX}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        error={errors.identifier}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <FormError message={formError} />
      <Button type="submit" block disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
      <button
        type="button"
        className="self-end text-sm text-text-muted underline-offset-4 hover:text-primary hover:underline"
        onClick={onForgotPassword}
      >
        Esqueci minha senha
      </button>
    </form>
  )
}

function RegisterForm({ onAccountCreated }: { onAccountCreated: (username: string) => void }) {
  const startSession = useStartSession()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const local = validateRegister({ username, email, password })
    setErrors(local)
    setFormError(null)
    if (hasErrors(local)) return

    setPending(true)
    try {
      startSession(await register(username, email, password))
    } catch (error) {
      // A conta existe, só faltou entrar: tentar o cadastro de novo daria "já está em uso"
      if (error instanceof AccountCreatedError) {
        onAccountCreated(error.username)
        return
      }
      const result = registerErrorFor(error)
      setErrors(result.fields)
      setFormError(result.form)
      setPending(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3 short:gap-2">
      {/* Celular deitado: usuário, e-mail, senha e botão numa linha só, acima do teclado */}
      <div className="grid items-start gap-3 short:grid-cols-[1fr_1.3fr_1fr_auto] short:gap-2">
        <TextField
          label="Nome de usuário"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={USERNAME_MAX}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={EMAIL_MAX}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {/* No celular deitado o botão fica na linha, alinhado com os campos (abaixo do rótulo) */}
        <Button type="submit" block disabled={pending} className="short:mt-5 short:w-auto">
          {pending ? 'Criando…' : 'Criar conta'}
        </Button>
      </div>
      <FormError message={formError} />
    </form>
  )
}
