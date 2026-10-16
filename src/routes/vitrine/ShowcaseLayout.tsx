import type { ReactNode } from 'react'

/** Bloco principal de uma aba da vitrine: título e "para que serve / como testar" */
export function ShowcasePanel({
  title,
  description,
  children,
}: {
  title: string
  description: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-bg-panel/50 p-4 short:gap-3 short:p-3"
    >
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-extrabold tracking-wide uppercase">{title}</h2>
        <p className="max-w-3xl text-sm text-text-muted">{description}</p>
      </header>
      {children}
    </section>
  )
}

/** Sub-bloco dentro de uma aba, com o seu próprio título e dica */
export function ShowcaseBlock({
  title,
  hint,
  children,
}: {
  title: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-xl border border-line/60 bg-bg-deep/40 p-3"
    >
      <header className="flex flex-col gap-0.5">
        <h3 className="font-display text-base font-bold tracking-wide text-primary uppercase">
          {title}
        </h3>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </header>
      {children}
    </section>
  )
}
