import { useState } from 'react'
import { Button, TimerBar } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import {
  ABILITIES,
  CHARACTERS,
  INITIAL_ABILITIES_TO_PICK,
  PREPARATION_SECONDS,
  STARTER_ABILITIES,
  STARTER_CHARACTERS,
} from '../../constants/game'
import { Character } from '../../features/characters'
import { otherSlot } from '../../lib/match'
import { sendCommand } from '../../sockets/gameClient'
import { useDraftStore } from '../../stores/draftStore'
import { useRoomStore } from '../../stores/roomStore'
import type { AbilityId, CharacterId } from '../../types/game'

type Step = 'CHARACTER' | 'ABILITIES'

/** Preparação do draft: personagem reservado no servidor e duas habilidades iniciais. */
export function Preparation() {
  const [step, setStep] = useState<Step>('CHARACTER')
  const [pickedAbilities, setPickedAbilities] = useState<AbilityId[]>([])
  const [submitted, setSubmitted] = useState(false)
  const deadline = useDraftStore((s) => s.deadline)
  const characters = useDraftStore((s) => s.characters)
  const ready = useDraftStore((s) => s.ready)
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const players = useRoomStore((s) => s.players)
  const opponentSlot = otherSlot(me)
  const opponent = players.find((player) => player.slot === opponentSlot)
  const myCharacter = characters[me]
  const opponentCharacter = characters[opponentSlot]
  const characterOptions = CHARACTERS
  const unlockedAbilities = STARTER_ABILITIES as readonly AbilityId[]
  const unlockedCharacters = STARTER_CHARACTERS as readonly CharacterId[]
  const isReady = ready[me]

  const toggleAbility = (ability: AbilityId) => {
    if (!unlockedAbilities.includes(ability) || submitted || isReady) return
    setPickedAbilities((current) => {
      if (current.includes(ability)) return current.filter((item) => item !== ability)
      if (current.length >= INITIAL_ABILITIES_TO_PICK) return current
      return [...current, ability]
    })
  }

  const confirmAbilities = () => {
    if (pickedAbilities.length !== INITIAL_ABILITIES_TO_PICK || submitted || isReady) return
    const [first, second] = pickedAbilities
    if (!first || !second) return
    sendCommand({ type: 'DRAFT_ABILITIES', payload: { abilities: [first, second] } })
    setSubmitted(true)
  }

  const selectCharacter = (character: CharacterId) => {
    if (!unlockedCharacters.includes(character) || character === opponentCharacter || isReady)
      return
    sendCommand({ type: 'DRAFT_CHARACTER', payload: { character } })
  }

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 px-3 pb-2 short:gap-2 short:px-safe sm:px-6">
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-primary/25 bg-bg-panel px-4 py-2 shadow-glow shadow-primary/10 short:py-1.5">
        <div className="min-w-0">
          <h1 className="font-display text-xs font-bold tracking-[0.2em] text-text-muted uppercase">
            Preparação
          </h1>
          <p className="truncate font-display text-sm font-bold text-primary sm:text-base">
            {opponent?.nickname ?? 'Oponente'}
          </p>
          <p className="text-xs text-text-muted">
            {ready[opponentSlot] ? 'Pronto' : 'Escolhendo…'}
          </p>
        </div>
        <div className="w-32 sm:w-48">
          <p className="mb-1 text-center font-display text-[10px] font-bold tracking-widest text-text-muted uppercase">
            Tempo restante
          </p>
          <TimerBar
            deadline={
              deadline === null
                ? null
                : {
                    startedAt: deadline - PREPARATION_SECONDS * 1000,
                    durationSeconds: PREPARATION_SECONDS,
                  }
            }
            label="Tempo da Preparação"
          />
        </div>
        <div className="min-w-0 text-right">
          <p className="font-display text-xs font-bold tracking-[0.2em] text-text-muted uppercase">
            Você
          </p>
          <p className="truncate font-display text-sm font-bold text-primary sm:text-base">
            {players.find((player) => player.slot === me)?.nickname ?? 'Jogador'}
          </p>
          <p className="text-xs text-text-muted">{isReady ? 'Pronto' : 'Escolhendo…'}</p>
        </div>
      </header>

      <nav aria-label="Etapas da preparação" className="flex shrink-0 justify-center gap-2">
        <StepButton
          active={step === 'CHARACTER'}
          done={Boolean(myCharacter)}
          onClick={() => setStep('CHARACTER')}
        >
          1 · Personagem
        </StepButton>
        <StepButton
          active={step === 'ABILITIES'}
          done={isReady}
          onClick={() => myCharacter && setStep('ABILITIES')}
        >
          2 · Habilidades
        </StepButton>
      </nav>

      {step === 'CHARACTER' ? (
        <section aria-labelledby="character-title" className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 shrink-0 text-center">
            <h2
              id="character-title"
              className="font-display text-lg font-black tracking-wide text-primary uppercase sm:text-xl"
            >
              Escolha seu personagem
            </h2>
            <p className="text-xs text-text-muted">
              O personagem altera apenas a aparência do seu lado.
            </p>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 sm:gap-3">
            {characterOptions.map((character) => {
              const info = CHARACTER_INFO[character]
              const locked = !unlockedCharacters.includes(character)
              const reservedByOpponent = character === opponentCharacter
              const selected = character === myCharacter
              const label = locked
                ? `Bloqueado · ${info.name}`
                : reservedByOpponent
                  ? `Reservado por ${opponent?.nickname ?? 'oponente'}`
                  : selected
                    ? `${info.name} · selecionado`
                    : info.name
              return (
                <button
                  key={character}
                  type="button"
                  disabled={locked || reservedByOpponent || isReady}
                  onClick={() => selectCharacter(character)}
                  aria-label={label}
                  aria-pressed={selected}
                  className={`relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 bg-bg-panel p-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary short:p-1 ${selected ? 'border-primary shadow-glow shadow-primary/35' : 'border-white/10'} ${locked || reservedByOpponent ? 'cursor-not-allowed' : 'hover:border-primary/60'}`}
                >
                  <Character
                    id={character}
                    className={`h-[58%] min-h-12 max-h-36 w-auto max-w-full short:h-7 short:min-h-0 short:max-h-7 ${locked || reservedByOpponent ? 'grayscale opacity-50' : ''}`}
                    decorative
                  />
                  <span className="mt-1 font-display text-sm font-bold text-primary">
                    {info.name}
                  </span>
                  <span className="text-center text-[10px] leading-tight text-text-muted sm:text-xs">
                    {locked
                      ? `🔒 ${info.price} Coins · Loja`
                      : reservedByOpponent
                        ? `🔒 Reservado por ${opponent?.nickname ?? 'oponente'}`
                        : selected
                          ? 'Selecionado'
                          : 'Disponível'}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex shrink-0 justify-center">
            <Button size="sm" disabled={!myCharacter} onClick={() => setStep('ABILITIES')}>
              Continuar para habilidades
            </Button>
          </div>
        </section>
      ) : (
        <section aria-labelledby="abilities-title" className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 shrink-0 text-center">
            <h2
              id="abilities-title"
              className="font-display text-lg font-black tracking-wide text-primary uppercase sm:text-xl"
            >
              Habilidades iniciais
            </h2>
            <p className="text-xs text-text-muted">
              Selecione exatamente {INITIAL_ABILITIES_TO_PICK}. {pickedAbilities.length}/
              {INITIAL_ABILITIES_TO_PICK} escolhidas.
            </p>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 sm:gap-3">
            {ABILITIES.filter((ability) => unlockedAbilities.includes(ability)).map((ability) => {
              const info = ABILITY_INFO[ability]
              const selected = pickedAbilities.includes(ability)
              return (
                <button
                  key={ability}
                  type="button"
                  disabled={submitted || isReady}
                  onClick={() => toggleAbility(ability)}
                  aria-pressed={selected}
                  aria-label={`${info.name}. ${info.description}`}
                  className={`relative flex min-h-0 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-bg-panel px-2 py-1 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'border-primary shadow-glow shadow-primary/30' : 'border-white/10'} hover:border-primary/60`}
                >
                  <span className="text-xl leading-none sm:text-2xl" aria-hidden="true">
                    {ABILITY_GLYPHS[ability]}
                  </span>
                  <span className="font-display text-xs font-bold text-primary sm:text-sm">
                    {info.name}
                  </span>
                  <span className="line-clamp-2 text-[9px] leading-tight text-text-muted sm:text-[10px]">
                    {info.description}
                  </span>
                  {selected && (
                    <span
                      className="absolute right-1 top-1 text-xs text-primary"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex shrink-0 flex-col items-center gap-1">
            <p className="text-center text-[10px] text-text-muted sm:text-xs">
              Quer mais opções de habilidades? Desbloqueie novas habilidades na Loja.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('CHARACTER')}
                disabled={submitted || isReady}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={confirmAbilities}
                disabled={
                  pickedAbilities.length !== INITIAL_ABILITIES_TO_PICK || submitted || isReady
                }
              >
                {isReady || submitted ? 'Aguardando oponente…' : 'Confirmar habilidades'}
              </Button>
            </div>
          </div>
        </section>
      )}
      <p role="status" className="sr-only">
        {ready[opponentSlot] ? 'Oponente pronto.' : 'Oponente escolhendo.'}
      </p>
    </main>
  )
}

function StepButton({
  active,
  done,
  onClick,
  children,
}: {
  active: boolean
  done: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-display text-[10px] font-bold uppercase transition sm:px-4 sm:text-xs ${active ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-text-muted hover:border-primary/50'}`}
    >
      {children}
      {done ? ' ✓' : ''}
    </button>
  )
}

const ABILITY_GLYPHS: Record<AbilityId, string> = {
  BOMBA: '💣',
  ESCUDO: '🛡️',
  AMPULHETA: '⏳',
  TORNADO: '🌪️',
  BURACO_NEGRO: '🕳️',
  CONGELAR: '❄️',
  CAMPO_DE_FORCA: '🔰',
  SILENCIO: '🤫',
  TROCA_RAPIDA: '⚡',
  REFORCO: '💪',
}
