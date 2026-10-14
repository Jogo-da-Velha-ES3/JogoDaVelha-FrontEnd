import { Cell, type CellProps } from '../features/board'
import { showToast } from '../stores/toastStore'

type Example = Omit<CellProps, 'row' | 'col'> & { title: string }

const EXAMPLES: Example[] = [
  { title: 'Vazia', piece: null },
  { title: 'Peça P1', piece: 'X' },
  { title: 'Peça P2', piece: 'O' },
  { title: 'Escudo', piece: null, effects: [{ kind: 'ESCUDO', turnsLeft: 2 }] },
  { title: 'Congelada', piece: 'ESTRELA', effects: [{ kind: 'CONGELAR', turnsLeft: 1 }] },
  { title: 'Reforço', piece: 'CORACAO', effects: [{ kind: 'REFORCO', turnsLeft: 2 }] },
  {
    title: 'Reforço + gelo',
    piece: 'QUADRADO',
    effects: [
      { kind: 'REFORCO', turnsLeft: 1 },
      { kind: 'CONGELAR', turnsLeft: 2 },
    ],
  },
  { title: 'Alvo possível', piece: 'TRIANGULO', aim: 'target' },
  { title: 'Alvo escolhido', piece: 'TRIANGULO', aim: 'selected' },
  { title: 'Linha vencedora', piece: 'X', winning: true },
]

// Seção da vitrine com uma casa de cada estado (FE-02)
export function CellShowcase() {
  return (
    <section aria-labelledby="casas" className="flex flex-col gap-3">
      <h2 id="casas" className="font-display text-lg font-bold text-text-muted uppercase">
        Casas do tabuleiro
      </h2>
      <ul className="flex flex-wrap gap-4">
        {EXAMPLES.map(({ title, ...cell }, i) => (
          <li key={title} className="flex w-16 flex-col items-center gap-1 text-center">
            <div className="w-12">
              <Cell
                {...cell}
                row={0}
                col={i}
                onSelect={() => showToast({ message: `Casa "${title}" escolhida` })}
              />
            </div>
            <span className="font-mono text-[10px] leading-tight text-text-muted">{title}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
