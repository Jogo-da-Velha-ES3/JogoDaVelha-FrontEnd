import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import { ABILITIES, CHARACTERS } from '../../constants/game'
import { AbilityIcon } from '../../features/powers/AbilityIcon'
import { ShowcaseBlock } from './ShowcaseLayout'
// Tamanhos usados no jogo: deck no celular deitado (16px), deck (20px), Como Jogar (24–40px)
const SMALL_SIZES = [
  { label: '16px', className: 'size-4' },
  { label: '20px', className: 'size-5' },
  { label: '24px', className: 'size-6' },
] as const

// Seção da vitrine com os 10 ícones de habilidade (FE-46)
export function AbilityIconShowcase() {
  return (
    <div className="flex flex-col gap-4">
      <ShowcaseBlock
        title="Os 10 ícones"
        hint="Estilo A (letreiro neon), na cor principal. O ícone herda a cor do texto de onde está."
      >
        <ul className="grid grid-cols-5 gap-3 short:gap-2">
          {ABILITIES.map((id) => (
            <li key={id} className="flex flex-col items-center gap-1.5 text-primary">
              <AbilityIcon ability={id} className="size-16 short:size-12" />
              <span className="text-center font-display text-xs font-bold uppercase">
                {ABILITY_INFO[id].name}
              </span>
            </li>
          ))}
        </ul>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Tamanho pequeno"
        hint="Os tamanhos do deck na Arena. Precisam continuar diferentes entre si."
      >
        <div className="flex flex-col gap-2">
          {SMALL_SIZES.map((size) => (
            <div key={size.label} className="flex items-center gap-3">
              <span className="w-10 font-mono text-xs text-text-muted">{size.label}</span>
              <div className="flex flex-wrap gap-3 text-primary">
                {ABILITIES.map((id) => (
                  <AbilityIcon key={id} ability={id} className={size.className} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Na cor de cada personagem"
        hint="Na Arena, o deck usa a cor do seu personagem (cor do lado)."
      >
        <div className="flex flex-col gap-2">
          {CHARACTERS.map((character) => (
            <div
              key={character}
              className="flex items-center gap-3"
              style={{ color: CHARACTER_INFO[character].color }}
            >
              <span className="w-20 font-display text-xs font-bold uppercase">
                {CHARACTER_INFO[character].name}
              </span>
              <div className="flex flex-wrap gap-3">
                {ABILITIES.map((id) => (
                  <AbilityIcon key={id} ability={id} className="size-6" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ShowcaseBlock>
    </div>
  )
}
