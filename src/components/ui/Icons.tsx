import type { ReactNode } from 'react'

/**
 * Ícones de interface (sem emoji, FE-46): traço na cor do texto (`currentColor`), cantos redondos.
 * Decorativos: o texto ao lado ou o `aria-label` do botão dizem o que são.
 */
function LineIcon({ className = 'size-4', children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
    >
      {children}
    </svg>
  )
}

/** Cadeado: personagem bloqueado ou reservado */
export function LockIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" />
    </LineIcon>
  )
}

/** Pausa: duas barras */
export function PauseIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <path d="M9 6 V18 M15 6 V18" />
    </LineIcon>
  )
}
