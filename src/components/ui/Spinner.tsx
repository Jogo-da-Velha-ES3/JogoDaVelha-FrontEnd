export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  /** O que está carregando, ex: "Entrando na sala…". Também é o que o leitor de tela anuncia */
  label: string
  size?: SpinnerSize
  className?: string
}

const RING: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-6 border-[3px]',
  lg: 'size-10 border-4 short:size-8 short:border-[3px]',
}

const TEXT: Record<SpinnerSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base short:text-sm',
}

/**
 * Espera por uma resposta do servidor: anel neon girando e o texto ao lado. Com "reduzir
 * movimento", o anel pulsa em vez de girar. Onde o formato já é conhecido (pacotes de Coins, as
 * estatísticas do Perfil), a tela mostra o próprio formato vazio no lugar.
 */
export function Spinner({ label, size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2.5 text-text-muted ${TEXT[size]} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 rounded-full border-primary/20 border-t-primary shadow-glow shadow-primary/25 motion-safe:animate-spin motion-reduce:animate-glow-pulse ${RING[size]}`}
      />
      <span>{label}</span>
    </div>
  )
}
