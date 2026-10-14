import { CHARACTER_INFO } from '../constants/characters'
import { CHARACTERS } from '../constants/game'
import { Character } from '../features/characters'
import type { CharacterId } from '../types/game'

// Tabuleiro de teste com casas de 40px: as peças precisam ser legíveis nesse tamanho
// prettier-ignore
const BOARD: (CharacterId | null)[] = [
  'X',         'O',        null,      'TRIANGULO',
  null,        'QUADRADO', 'ESTRELA', null,
  'CORACAO',   null,       'X',       'O',
  'TRIANGULO', 'QUADRADO', null,      'ESTRELA',
]

// Seção da vitrine com os 6 personagens nas 3 versões (FE-24)
export function CharacterShowcase() {
  return (
    <section aria-labelledby="personagens" className="flex flex-col gap-3">
      <h2 id="personagens" className="font-display text-lg font-bold text-text-muted uppercase">
        Personagens neon
      </h2>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {CHARACTERS.map((id) => (
          <li key={id} className="flex flex-col items-center gap-1">
            <Character id={id} decorative className="w-full max-w-32 short:max-w-24" />
            <span
              className="font-display text-sm font-bold uppercase"
              style={{ color: CHARACTER_INFO[id].color }}
            >
              {CHARACTER_INFO[id].name}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col items-center gap-1">
          <div className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-bg-base p-1.5">
            {BOARD.map((id, i) => (
              <div
                key={i}
                className="grid size-10 place-items-center rounded-md border border-line/70 bg-bg-panel"
              >
                {id && <Character id={id} variant="piece" className="size-8" />}
              </div>
            ))}
          </div>
          <span className="font-mono text-xs text-text-muted">peças em casas de 40px</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-2">
            {CHARACTERS.map((id) => (
              <Character key={id} id={id} variant="avatar" className="size-10" />
            ))}
          </div>
          <span className="font-mono text-xs text-text-muted">avatares</span>
        </div>
      </div>
    </section>
  )
}
