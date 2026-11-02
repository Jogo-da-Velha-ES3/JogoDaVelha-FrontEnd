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

/** Engrenagem: Configurações */
export function GearIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 2.5 V6 M12 18 V21.5 M2.5 12 H6 M18 12 H21.5 M5.3 5.3 L7.8 7.8 M16.2 16.2 L18.7 18.7 M18.7 5.3 L16.2 7.8 M7.8 16.2 L5.3 18.7" />
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
