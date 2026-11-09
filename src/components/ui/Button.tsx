import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Ocupa a largura toda do contêiner */
  block?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary shadow-glow shadow-primary/40 hover:shadow-glow-lg hover:shadow-primary/50',
  secondary:
    'border-2 border-primary/70 text-primary hover:border-primary hover:shadow-glow hover:shadow-primary/30',
  danger: 'bg-danger text-primary shadow-glow shadow-danger/50 hover:shadow-glow-lg',
  ghost: 'text-text-muted hover:text-primary hover:bg-bg-raised',
}

// Altura mínima de 44px no md/lg para o toque no celular deitado
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-13 px-7 text-xl short:min-h-11 short:text-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-display font-bold tracking-wide uppercase',
        'transition duration-150 select-none active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    />
  )
}
