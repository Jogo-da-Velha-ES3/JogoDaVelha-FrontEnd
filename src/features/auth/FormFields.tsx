// Campos de formulário da área de conta (Acesso, "Esqueci minha senha" e "Nova senha").
// Movidos do AccessScreen (FE-25) sem mudar comportamento nem visual.
import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({ label, error, ...props }: TextFieldProps) {
  const id = useId()
  const errorId = `${id}-erro`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold tracking-wide text-text-muted uppercase">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[
          'min-h-11 rounded-xl border-2 bg-bg-panel px-3 text-base text-text outline-none short:min-h-10',
          'transition focus:border-primary focus:shadow-glow focus:shadow-primary/20',
          error ? 'border-danger' : 'border-line',
        ].join(' ')}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-center text-sm text-danger">
      {message}
    </p>
  )
}
