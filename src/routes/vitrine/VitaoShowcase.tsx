import { VITAO_EXPRESSIONS, VitaoFigure, type VitaoExpression } from '../../features/vitao'
import { ShowcaseBlock } from './ShowcaseLayout'

const EXPRESSIONS = Object.keys(VITAO_EXPRESSIONS) as VitaoExpression[]

// Seção da vitrine com o bonequinho do Vitão nas 8 expressões (FE-41). No jogo ele continua
// escondido com VITAO_ENABLED=false.
export function VitaoShowcase() {
  return (
    <ShowcaseBlock
      title="As 8 expressões"
      hint="O bonequinho parado em cada expressão e, embaixo, no tamanho do espaço da Arena no celular deitado (~100px). A animação chega com a FE-42."
    >
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {EXPRESSIONS.map((expression) => (
          <li key={expression} className="flex flex-col items-center gap-1">
            <VitaoFigure
              expression={expression}
              decorative
              className="h-40 w-full max-w-28 short:h-28"
            />
            <span className="text-center font-display text-sm font-bold text-text-muted uppercase">
              {VITAO_EXPRESSIONS[expression].label}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-3 rounded-xl border border-line bg-bg-base p-2">
          {EXPRESSIONS.map((expression) => (
            <VitaoFigure
              key={expression}
              expression={expression}
              decorative
              className="h-[100px]"
            />
          ))}
        </div>
        <span className="font-mono text-xs text-text-muted">altura de 100px, como na Arena</span>
      </div>
    </ShowcaseBlock>
  )
}
