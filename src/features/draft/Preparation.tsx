import { useEffect, useState } from 'react'
import { Button, LockIcon, TimerBar } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import {
  ABILITIES,
  CHARACTERS,
  INITIAL_ABILITIES_TO_PICK,
  PREPARATION_AUTO_ADVANCE_MS,
  PREPARATION_SECONDS,
  PREPARATION_WARN_SECONDS,
} from '../../constants/game'
import { useServerTimer } from '../../hooks/useServerTimer'
import { Character } from '../characters'
import { AbilityIcon } from '../powers/AbilityIcon'
import { otherSlot } from '../../lib/match'
import { sendCommand } from '../../sockets/gameClient'
import { useDraftStore } from '../../stores/draftStore'
import { useRoomStore } from '../../stores/roomStore'
import type { AbilityId, CharacterId } from '../../types/game'

type Step = 'CHARACTER' | 'ABILITIES'

export interface PreparationProps {
  /**
   * O que o jogador já desbloqueou. Até o inventário real chegar (FE-30, `/me`), tudo vem
   * desbloqueado para o time conseguir testar; os testes passam só os iniciais.
   */
  unlockedCharacters?: readonly CharacterId[]
  unlockedAbilities?: readonly AbilityId[]
}

/** Preparação do draft: personagem reservado no servidor e duas habilidades iniciais. */
export function Preparation({
  unlockedCharacters = CHARACTERS,
  unlockedAbilities = ABILITIES,
}: PreparationProps) {
  const [chosenStep, setStep] = useState<Step>('CHARACTER')
  const [pickedAbilities, setPickedAbilities] = useState<AbilityId[]>([])
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
  const abilityOptions = ABILITIES.filter((ability) => unlockedAbilities.includes(ability))
  const isReady = ready[me]
  const timerDeadline =
    deadline === null
      ? null
      : { startedAt: deadline - PREPARATION_SECONDS * 1000, durationSeconds: PREPARATION_SECONDS }
  const timer = useServerTimer(timerDeadline, 250)

  // Reta final: avisa o que falta; com o personagem já escolhido, fica nas habilidades
  const warning =
    !isReady &&
    timer !== null &&
    timer.remainingMs > 0 &&
    timer.remainingSeconds <= PREPARATION_WARN_SECONDS
  const step: Step = warning && myCharacter ? 'ABILITIES' : chosenStep

  // O servidor confirmou o personagem: segue sozinho para as habilidades (dá para voltar)
  useEffect(() => {
    let advance: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = useDraftStore.subscribe((state, previous) => {
      const confirmed = state.characters[me]
      if (!confirmed || confirmed === previous.characters[me] || state.ready[me]) return
      clearTimeout(advance)
      advance = setTimeout(() => setStep('ABILITIES'), PREPARATION_AUTO_ADVANCE_MS)
    })
    return () => {
      unsubscribe()
      clearTimeout(advance)
    }
  }, [me])

  const myStatus = isReady
    ? 'Pronto'
    : !myCharacter
      ? 'Falta: personagem'
      : `Falta: habilidades (${pickedAbilities.length}/${INITIAL_ABILITIES_TO_PICK})`

  const toggleAbility = (ability: AbilityId) => {
    if (!unlockedAbilities.includes(ability) || isReady) return
    setPickedAbilities((current) => {
      if (current.includes(ability)) return current.filter((item) => item !== ability)
      if (current.length >= INITIAL_ABILITIES_TO_PICK) return current
      return [...current, ability]
    })
  }

  const confirmAbilities = () => {
    if (pickedAbilities.length !== INITIAL_ABILITIES_TO_PICK || isReady) return
    const [first, second] = pickedAbilities
    if (!first || !second) return
    // Só a intenção: a tela trava quando o servidor confirmar (ready[me] no DRAFT_UPDATE)
    sendCommand({ type: 'DRAFT_ABILITIES', payload: { abilities: [first, second] } })
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
          <TimerBar deadline={timerDeadline} label="Tempo da Preparação" />
        </div>
        <div className="min-w-0 text-right">
          <p className="font-display text-xs font-bold tracking-[0.2em] text-text-muted uppercase">
            Você
          </p>
          <p className="truncate font-display text-sm font-bold text-primary sm:text-base">
            {players.find((player) => player.slot === me)?.nickname ?? 'Jogador'}
          </p>
          <p className={`text-xs ${isReady ? 'text-text-muted' : 'font-bold text-primary'}`}>
            {myStatus}
          </p>
        </div>
      </header>

      <nav aria-label="Etapas da preparação" className="flex shrink-0 justify-center gap-2">
        <StepButton
          active={step === 'CHARACTER'}
          done={Boolean(myCharacter)}
          pending={!myCharacter}
          onClick={() => setStep('CHARACTER')}
        >
          1 · Personagem
        </StepButton>
        <StepButton
          active={step === 'ABILITIES'}
          done={isReady}
          pending={Boolean(myCharacter) && !isReady}
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
            {warning ? (
              <TimeWarning seconds={timer.remainingSeconds} missing="seu personagem" />
            ) : (
              <p className="text-xs text-text-muted">
                O personagem altera apenas a aparência do seu lado.
              </p>
            )}
          </div>
          {/* Linhas fixas (metade da altura cada): o tamanho do cartão não depende do personagem.
              Sem isso o Safari entra em ciclo (o desenho é % do cartão) e a linha fica pulsando */}
          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-2 sm:gap-3">
            {characterOptions.map((character) => {
              const info = CHARACTER_INFO[character]
              const locked = !unlockedCharacters.includes(character)
              const reservedByOpponent = character === opponentCharacter
              const selected = character === myCharacter
              // Reservado pelo oponente vem antes do preço: mostra o nome de quem reservou [RF-DRAFT-02]
              const label = reservedByOpponent
                ? `Reservado por ${opponent?.nickname ?? 'oponente'}`
                : locked
                  ? `Bloqueado · ${info.name}`
                  : selected
                    ? `${info.name} · selecionado`
                    : info.name
              // Em tela baixa (celular deitado) o cartão fica horizontal: o personagem ocupa a
              // altura toda à esquerda em vez de virar um ícone pequeno
              return (
                <button
                  key={character}
                  type="button"
                  disabled={locked || reservedByOpponent || isReady}
                  onClick={() => selectCharacter(character)}
                  aria-label={label}
                  aria-pressed={selected}
                  className={`relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 bg-bg-panel p-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary short:flex-row short:justify-start short:gap-2 short:px-2 short:py-1 ${selected ? 'border-primary shadow-glow shadow-primary/35' : 'border-line'} ${locked || reservedByOpponent ? 'cursor-not-allowed' : 'hover:border-primary/60'}`}
                >
                  <Character
                    id={character}
                    className={`h-[58%] min-h-12 max-h-36 w-auto max-w-full shrink-0 short:h-[88%] short:min-h-0 short:max-w-[45%] ${locked || reservedByOpponent ? 'grayscale opacity-50' : ''}`}
                    decorative
                  />
                  <span className="flex min-w-0 flex-col items-center short:items-start">
                    <span className="mt-1 font-display text-sm font-bold text-primary short:mt-0">
                      {info.name}
                    </span>
                    <span className="text-center text-[10px] leading-tight text-text-muted short:text-left sm:text-xs">
                      {(reservedByOpponent || locked) && (
                        <LockIcon className="mr-0.5 size-3 align-[-2px]" />
                      )}
                      {reservedByOpponent
                        ? `Reservado por ${opponent?.nickname ?? 'oponente'}`
                        : locked
                          ? `${info.price} Coins · Loja`
                          : selected
                            ? 'Selecionado'
                            : 'Disponível'}
                    </span>
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
            {warning ? (
              <TimeWarning seconds={timer.remainingSeconds} missing="suas 2 habilidades" />
            ) : (
              <p className="text-xs text-text-muted">
                Selecione exatamente {INITIAL_ABILITIES_TO_PICK}. {pickedAbilities.length}/
                {INITIAL_ABILITIES_TO_PICK} escolhidas.
              </p>
            )}
          </div>
          {/* Até 3: uma linha; mais que isso (compradas na Loja): 2 linhas de 5, sem rolar */}
          <div
            className={`grid min-h-0 flex-1 gap-2 sm:gap-3 ${abilityOptions.length > 3 ? 'grid-cols-5 grid-rows-2' : 'grid-cols-3 grid-rows-1'}`}
          >
            {abilityOptions.map((ability) => {
              const info = ABILITY_INFO[ability]
              const selected = pickedAbilities.includes(ability)
              return (
                <button
                  key={ability}
                  type="button"
                  disabled={isReady}
                  onClick={() => toggleAbility(ability)}
                  aria-pressed={selected}
                  aria-label={`${info.name}. ${info.description}`}
                  className={`relative flex min-h-0 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-bg-panel px-2 py-1 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'border-primary shadow-glow shadow-primary/30' : 'border-line'} hover:border-primary/60`}
                >
                  <AbilityIcon ability={ability} className="size-6 text-primary" />
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
                disabled={isReady}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={confirmAbilities}
                disabled={pickedAbilities.length !== INITIAL_ABILITIES_TO_PICK || isReady}
              >
                {isReady ? 'Aguardando oponente…' : 'Confirmar habilidades'}
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

/** Reta final da Preparação: vermelho, porque é perigo de perder a escolha */
function TimeWarning({ seconds, missing }: { seconds: number; missing: string }) {
  return (
    <p role="alert" className="text-xs font-bold text-danger">
      Faltam {seconds}s! Escolha {missing}, senão o jogo escolhe por você.
    </p>
  )
}

function StepButton({
  active,
  done,
  pending,
  onClick,
  children,
}: {
  active: boolean
  done: boolean
  /** Ainda falta fazer: pulsa para chamar a atenção quando não é a etapa aberta */
  pending: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-display text-[10px] font-bold uppercase transition sm:px-4 sm:text-xs ${active ? 'border-primary bg-primary/15 text-primary' : 'border-line text-text-muted hover:border-primary/50'} ${pending && !active ? 'border-primary text-primary motion-safe:animate-glow-pulse' : ''}`}
    >
      {children}
      {done ? ' ✓' : ''}
    </button>
  )
}
