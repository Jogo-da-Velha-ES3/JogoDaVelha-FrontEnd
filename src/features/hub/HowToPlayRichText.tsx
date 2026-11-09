import { Fragment, type ReactNode } from 'react'

// "Morte Súbita" aparece sempre em vermelho com brilho, onde quer que esteja no texto
const DANGER_TERM = /(morte s[úu]bita)/i

/** Separa o termo de perigo do resto do trecho e o pinta de vermelho com brilho */
function withDanger(part: string): ReactNode {
  return part.split(DANGER_TERM).map((piece, index) =>
    index % 2 === 1 ? (
      <span
        key={index}
        className="text-danger [text-shadow:0_0_10px_color-mix(in_srgb,var(--color-danger)_60%,transparent)]"
      >
        {piece}
      </span>
    ) : (
      <Fragment key={index}>{piece}</Fragment>
    ),
  )
}

/**
 * Texto das regras com destaque: o trecho entre `**` vira negrito com um brilho leve. Os trechos
 * ficam nos índices ímpares do `split`. Sem `**`, devolve o texto como está. "Morte Súbita" sai
 * sempre em vermelho com brilho (dentro ou fora do negrito).
 */
export function HowToPlayRichText({ text }: { text: string }) {
  return text.split('**').map((part, index) =>
    index % 2 === 1 ? (
      <strong
        key={index}
        className="font-bold text-primary [text-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary)_40%,transparent)]"
      >
        {withDanger(part)}
      </strong>
    ) : (
      <Fragment key={index}>{withDanger(part)}</Fragment>
    ),
  )
}
