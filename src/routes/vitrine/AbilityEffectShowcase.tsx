import { useEffect, useState } from 'react'
import { Button } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { ABILITIES, ABILITY_IMPACT_SECONDS } from '../../constants/game'
import { Board } from '../../features/board'
import {
  abilityDemo,
  type AbilityDemo,
  type DemoOutcome,
} from '../../features/powers/effects/abilityDemo'
import { playSound } from '../../features/sound'
import { abilitySoundKey } from '../../features/sound/soundMap'
import { useIsBefore } from '../../hooks/useIsBefore'
import type { AbilityId, PlayerSlot } from '../../types/game'
import { ShowcaseBlock } from './ShowcaseLayout'

// Intervalo do "Repetir": o efeito e uma pausa curta antes de começar de novo
const LOOP_MS = ABILITY_IMPACT_SECONDS * 1000 + 800

interface Choice {
  ability: AbilityId
  outcome: DemoOutcome
  label: string
}

const CHOICES: Choice[] = [
  ...ABILITIES.map((ability) => ({
    ability,
    outcome: 'APPLIED' as const,
    label: ABILITY_INFO[ability].name,
  })),
  { ability: 'BOMBA', outcome: 'ABSORBED', label: 'Bomba anulada' },
  { ability: 'TORNADO', outcome: 'NO_EFFECT', label: 'Tornado sem efeito' },
]

const SIDES: { slot: PlayerSlot; label: string }[] = [
  { slot: 'P1', label: 'Você (X)' },
  { slot: 'P2', label: 'Oponente (O)' },
]

/** Monta a demonstração e toca o som da habilidade, como na partida */
function startDemo(choice: Choice, side: PlayerSlot): AbilityDemo & { receivedAt: number } {
  playSound(abilitySoundKey(choice.ability))
  return { ...abilityDemo(choice.ability, side, choice.outcome), receivedAt: Date.now() }
}

/** Animação de cada habilidade (FE-47) num tabuleiro de exemplo, como o servidor mandaria */
export function AbilityEffectShowcase() {
  const [by, setBy] = useState<PlayerSlot>('P1')
  const [choice, setChoice] = useState<Choice | null>(null)
  const [loop, setLoop] = useState(false)
  const [play, setPlay] = useState<(AbilityDemo & { receivedAt: number }) | null>(null)
  const playing = useIsBefore(play ? play.receivedAt + ABILITY_IMPACT_SECONDS * 1000 : null)

  const run = (next: Choice, side = by) => {
    setChoice(next)
    setPlay(startDemo(next, side))
  }

  useEffect(() => {
    if (!loop || !choice) return
    const id = setInterval(() => setPlay(startDemo(choice, by)), LOOP_MS)
    return () => clearInterval(id)
  }, [loop, choice, by])

  const cells = play?.cells ?? abilityDemo('BOMBA', by, 'ABSORBED').cells

  return (
    <ShowcaseBlock
      title="Animações das habilidades"
      hint="Toque numa habilidade para ver a animação como na partida: o tabuleiro já mostra o estado que o servidor manda depois dela. Com o som ligado, toca o efeito junto."
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="size-72 shrink-0 short:size-56">
          <Board
            cells={cells}
            characters={{ P1: 'X', P2: 'O' }}
            impact={
              playing && play
                ? { ...play.result, serverTime: play.receivedAt, receivedAt: play.receivedAt }
                : null
            }
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="mb-1 text-xs text-text-muted">Quem usa a habilidade</legend>
            {SIDES.map((side) => (
              <Button
                key={side.slot}
                size="sm"
                variant={by === side.slot ? 'primary' : 'ghost'}
                aria-pressed={by === side.slot}
                onClick={() => {
                  setBy(side.slot)
                  if (choice) run(choice, side.slot)
                }}
              >
                {side.label}
              </Button>
            ))}
          </fieldset>

          <ul className="flex flex-wrap gap-2">
            {CHOICES.map((item) => (
              <li key={item.label}>
                <Button
                  size="sm"
                  variant={choice?.label === item.label ? 'primary' : 'secondary'}
                  onClick={() => run(item)}
                >
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>

          <label className="flex items-center gap-2 text-sm">
            <input
              id="efeito-repetir"
              type="checkbox"
              checked={loop}
              onChange={(event) => setLoop(event.target.checked)}
              className="size-4 accent-(--color-primary)"
            />
            Repetir sem parar (bom para ajustar uma animação)
          </label>
        </div>
      </div>
    </ShowcaseBlock>
  )
}
