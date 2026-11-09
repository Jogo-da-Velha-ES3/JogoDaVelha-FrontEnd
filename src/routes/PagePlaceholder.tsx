import type { ReactNode } from 'react'

interface PagePlaceholderProps {
  title: string
  /** Card que vai preencher esta página, ex: "FE-25" */
  card: string
  /** Quem pegou o card */
  owner: string
  children?: ReactNode
}

/** Página vazia de uma rota, esperando o card responsável (FE-07). Apagar ao preencher. */
export function PagePlaceholder({ title, card, owner, children }: PagePlaceholderProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center short:gap-2 short:py-3">
      <h1 className="font-display text-4xl font-extrabold tracking-wide text-primary uppercase short:text-3xl">
        {title}
      </h1>
      <p className="font-mono text-xs text-text-muted">
        Em construção · {card} · {owner}
      </p>
      {children}
    </section>
  )
}
