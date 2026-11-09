import { useState } from 'react'
import { Button } from '../../components/ui'
import { VitaoView } from '../../features/vitao/VitaoView'
import type { VitaoExpression } from '../../lib/vitao'
import { ShowcaseBlock } from './ShowcaseLayout'

const EXPRESSIONS: { expression: VitaoExpression; label: string }[] = [
  { expression: 'NORMAL', label: 'Normal' },
  { expression: 'RINDO', label: 'Rindo (comemora)' },
  { expression: 'SURPRESO', label: 'Surpreso (susto)' },
  { expression: 'DEBOCHADO', label: 'Debochado' },
  { expression: 'DORMINDO', label: 'Dormindo' },
  { expression: 'BRAVO', label: 'Bravo' },
  { expression: 'MUITO_BRAVO', label: 'Muito bravo' },
  { expression: 'DIABO', label: 'Diabo' },
]

// Tamanho do espaço do Vitão na Arena: celular deitado (~330px de altura) e desktop (720px)
const FRAMES = [
  { label: 'Celular deitado', className: 'h-36 w-44' },
  { label: 'Desktop', className: 'h-80 w-60' },
]

/** O Vitão (FE-42) com cada expressão e o balão, sem precisar de partida */
export function VitaoShowcase() {
  const [expression, setExpression] = useState<VitaoExpression>('NORMAL')
  const [text, setText] = useState('Ô, campeão, vai jogar ou vai ficar olhando pro tabuleiro?')
  const [devil, setDevil] = useState(false)
  const [reactionId, setReactionId] = useState(1)

  const react = (next: VitaoExpression) => {
    setExpression(next)
    setDevil(next === 'DIABO')
    setReactionId((id) => id + 1)
  }

  return (
    <ShowcaseBlock
      title="Expressões e reações"
      hint="Toque numa expressão para o Vitão reagir, como quando o motor de reações manda uma fala. Sem texto, o balão some e ele fica só respirando. Com 'reduzir movimento' no aparelho, ele fica parado."
    >
      <div className="flex flex-wrap items-start gap-4">
        {FRAMES.map((frame) => (
          <figure key={frame.label} className="flex flex-col items-center gap-1">
            <div className={`rounded-xl border border-line/60 bg-bg-base p-2 ${frame.className}`}>
              <VitaoView
                expression={expression}
                text={text}
                devil={devil}
                reactionId={reactionId}
              />
            </div>
            <figcaption className="text-xs text-text-muted">{frame.label}</figcaption>
          </figure>
        ))}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ul className="flex flex-wrap gap-2">
            {EXPRESSIONS.map((item) => (
              <li key={item.expression}>
                <Button
                  size="sm"
                  variant={expression === item.expression ? 'primary' : 'secondary'}
                  onClick={() => react(item.expression)}
                >
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>

          <label className="flex flex-col gap-1 text-sm">
            Fala no balão
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Vazio: sem balão"
              className="rounded-lg border border-line bg-bg-deep px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={devil}
              onChange={(event) => setDevil(event.target.checked)}
              className="size-4 accent-(--color-primary)"
            />
            Balão do Diabo (Morte Súbita)
          </label>
        </div>
      </div>
    </ShowcaseBlock>
  )
}
