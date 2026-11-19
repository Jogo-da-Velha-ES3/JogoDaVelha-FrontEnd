import { useEffect, useRef, useState } from 'react'
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
import { DRAFT_TEXTS } from '../../constants/texts'
import { usePendingIntent } from '../../hooks/usePendingIntent'
import { useServerTimer } from '../../hooks/useServerTimer'
import { Character } from '../characters'
import { AbilityIcon } from '../powers/AbilityIcon'
import { otherSlot } from '../../lib/match'
import { sendCommand } from '../../sockets/gameClient'
import { useDraftStore } from '../../stores/draftStore'
import { useRoomStore } from '../../stores/roomStore'
import { showToast } from '../../stores/toastStore'
import type { AbilityId, CharacterId } from '../../types/game'

type Step = 'CHARACTER' | 'ABILITIES'

export interface PreparationProps {
  /**
   * O que o jogador já desbloqueou. Na sala, vem do inventário do `profileStore` (FE-30); sem a
   * prop (vitrine), tudo fica desbloqueado. Os testes passam só os iniciais.
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
  /** Mais de 3 (compradas na Loja): 2 linhas de 5 */
  const manyAbilities = abilityOptions.length > 3
  const isReady = ready[me]
  // "Confirmar habilidades" trava até o servidor confirmar (ready) ou recusar (AMB-02)
  const { pending: confirming, send } = usePendingIntent<'CONFIRM'>(String(isReady))
  /** Mandei as habilidades: sem isso, ficar pronto quer dizer que o tempo acabou e o jogo escolheu */
  const sentAbilities = useRef(false)
  const timerDeadline =
    deadline === null
      ? null
      : { startedAt: deadline - PREPARATION_SECONDS * 1000, durationSeconds: PREPARATION_SECONDS }
  const timer = useServerTimer(timerDeadline, 250)

  // Reta final: avisa o que falta
  const warning =
    !isReady &&
    timer !== null &&
    timer.remainingMs > 0 &&
    timer.remainingSeconds <= PREPARATION_WARN_SECONDS
  // Com o personagem já escolhido, a reta final leva às habilidades uma vez só: o Voltar continua
  // valendo até o fim (FRT-04). Antes a tela ficava presa nas habilidades nos últimos segundos
  const [finalStretchJumped, setFinalStretchJumped] = useState(false)
  if (warning && myCharacter && !finalStretchJumped) {
    setFinalStretchJumped(true)
    setStep('ABILITIES')
  }
  const step = chosenStep

  // O servidor confirmou o personagem: segue sozinho para as habilidades (dá para voltar)
  useEffect(() => {
    let advance: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = useDraftStore.subscribe((state, previous) => {
      // O tempo acabou e o servidor completou as minhas escolhas: avisa, porque a tela da
      // Preparação some logo em seguida (SUG-01)
      if (state.ready[me] && !previous.ready[me] && !sentAbilities.current) {
        showToast({ message: DRAFT_TEXTS.autoPicked, tone: 'info' })
      }
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
      ? DRAFT_TEXTS.missingCharacter
      : DRAFT_TEXTS.missingAbilities(pickedAbilities.length, INITIAL_ABILITIES_TO_PICK)

  const toggleAbility = (ability: AbilityId) => {
    if (!unlockedAbilities.includes(ability) || isReady || confirming) return
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
    sentAbilities.current = true
    send('CONFIRM', { type: 'DRAFT_ABILITIES', payload: { abilities: [first, second] } })
  }

  const selectCharacter = (character: CharacterId) => {
    if (!unlockedCharacters.includes(character) || character === opponentCharacter || isReady)
      return
    sendCommand({ type: 'DRAFT_CHARACTER', payload: { character } })
  }

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 px-3 pb-2 short:gap-2 short:px-safe tiny:gap-1 tiny:pb-1 sm:px-6 tall:gap-5">
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-primary/25 bg-bg-panel px-4 py-2 shadow-glow shadow-primary/10 short:py-1.5 tiny:rounded-xl tiny:py-1 tall:px-6 tall:py-3">
        <div className="min-w-0">
          <h1 className="font-display text-xs font-bold tracking-[0.2em] text-text-muted uppercase tiny:sr-only tall:text-sm">
            Preparação
          </h1>
          <p className="truncate font-display text-sm font-bold text-primary sm:text-base tall:text-xl">
            {opponent?.nickname ?? 'Oponente'}
          </p>
          <p className="text-xs text-text-muted tall:text-sm">
            {ready[opponentSlot] ? 'Pronto' : 'Escolhendo…'}
          </p>
        </div>
        <div className="w-32 sm:w-48 tall:w-64">
          <p className="mb-1 text-center font-display text-[0.625rem] font-bold tracking-widest text-text-muted uppercase tiny:sr-only tall:text-xs">
            Tempo restante
          </p>
          <TimerBar deadline={timerDeadline} label="Tempo da Preparação" />
        </div>
        <div className="min-w-0 text-right">
          <p className="font-display text-xs font-bold tracking-[0.2em] text-text-muted uppercase tiny:sr-only tall:text-sm">
            Você
          </p>
          <p className="truncate font-display text-sm font-bold text-primary sm:text-base tall:text-xl">
            {players.find((player) => player.slot === me)?.nickname ?? 'Jogador'}
          </p>
          <p
            className={`text-xs tall:text-sm ${isReady ? 'text-text-muted' : 'font-bold text-primary'}`}
          >
            {myStatus}
          </p>
        </div>
      </header>

      <nav
        aria-label="Etapas da preparação"
        className="flex shrink-0 justify-center gap-2 tall:gap-3"
      >
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
          <div className="mb-2 shrink-0 text-center tiny:mb-0.5 tall:mb-4">
            <h2
              id="character-title"
              className="font-display text-lg font-black tracking-wide text-primary uppercase tiny:sr-only sm:text-xl tall:text-3xl"
            >
              {DRAFT_TEXTS.chooseCharacter}
            </h2>
            {warning ? (
              <TimeWarning
                seconds={timer.remainingSeconds}
                missing={DRAFT_TEXTS.missingCharacterWarning}
              />
            ) : (
              <p className="text-xs text-text-muted tiny:hidden tall:text-base">
                {DRAFT_TEXTS.characterHint}
              </p>
            )}
          </div>
          {/* Linhas fixas (metade da altura cada): o tamanho do cartão não depende do personagem.
              Sem isso o Safari entra em ciclo (o desenho é % do cartão) e a linha fica pulsando */}
          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-2 tiny:grid-cols-6 tiny:grid-rows-1 tiny:gap-1.5 sm:gap-3">
            {characterOptions.map((character) => {
              const info = CHARACTER_INFO[character]
              const locked = !unlockedCharacters.includes(character)
              const reservedByOpponent = character === opponentCharacter
              const selected = character === myCharacter
              // Reservado pelo oponente vem antes do preço: mostra o nome de quem reservou [RF-DRAFT-02]
              const label = reservedByOpponent
                ? DRAFT_TEXTS.reservedBy(opponent?.nickname ?? 'oponente')
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
                  className={`relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 bg-bg-panel p-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary short:flex-row short:justify-start short:gap-2 short:px-2 short:py-1 tiny:flex-col tiny:justify-center tiny:gap-0.5 tiny:px-1 ${selected ? 'border-primary shadow-glow shadow-primary/35' : 'border-line'} ${locked || reservedByOpponent ? 'cursor-not-allowed' : 'hover:border-primary/60'}`}
                >
                  <Character
                    id={character}
                    className={`h-[58%] min-h-12 max-h-36 w-auto max-w-full shrink-0 tall:max-h-56 short:h-[88%] short:min-h-0 short:max-w-[45%] tiny:h-[58%] tiny:max-w-full ${locked || reservedByOpponent ? 'grayscale opacity-50' : ''}`}
                    decorative
                  />
                  <span className="flex min-w-0 flex-col items-center short:items-start tiny:items-center">
                    <span className="mt-1 font-display text-sm font-bold text-primary short:mt-0 tall:text-lg">
                      {info.name}
                    </span>
                    <span className="text-center text-[0.625rem] leading-tight text-text-muted short:text-left tiny:text-center sm:text-xs tall:text-sm">
                      {(reservedByOpponent || locked) && (
                        <LockIcon className="mr-0.5 size-3 align-[-2px] tall:size-4" />
                      )}
                      {reservedByOpponent
                        ? DRAFT_TEXTS.reservedBy(opponent?.nickname ?? 'oponente')
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
          <div className="mt-2 flex shrink-0 justify-center tiny:mt-1 tall:mt-4">
            <Button size="sm" disabled={!myCharacter} onClick={() => setStep('ABILITIES')}>
              Continuar para habilidades
            </Button>
          </div>
        </section>
      ) : (
        <section aria-labelledby="abilities-title" className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 shrink-0 text-center tiny:mb-0.5 tall:mb-4">
            <h2
              id="abilities-title"
              className="font-display text-lg font-black tracking-wide text-primary uppercase tiny:sr-only sm:text-xl tall:text-3xl"
            >
              Habilidades iniciais
            </h2>
            {warning ? (
              <TimeWarning
                seconds={timer.remainingSeconds}
                missing={DRAFT_TEXTS.missingAbilitiesWarning(INITIAL_ABILITIES_TO_PICK)}
              />
            ) : (
              <p className="text-xs text-text-muted tiny:hidden tall:text-base">
                {DRAFT_TEXTS.abilitiesHint(pickedAbilities.length, INITIAL_ABILITIES_TO_PICK)}
              </p>
            )}
          </div>
          {/* Até 3: uma linha; mais que isso (compradas na Loja): 2 linhas de 5, sem rolar */}
          <div
            className={`grid min-h-0 flex-1 gap-2 tiny:gap-1.5 sm:gap-3 ${manyAbilities ? 'grid-cols-5 grid-rows-2' : 'grid-cols-3 grid-rows-1 tall:grid-rows-[minmax(0,22rem)] tall:content-center'}`}
          >
            {abilityOptions.map((ability) => {
              const info = ABILITY_INFO[ability]
              const selected = pickedAbilities.includes(ability)
              return (
                <button
                  key={ability}
                  type="button"
                  disabled={isReady || confirming !== null}
                  onClick={() => toggleAbility(ability)}
                  aria-pressed={selected}
                  aria-label={`${info.name}. ${info.description}`}
                  className={`relative flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 bg-bg-panel px-2 py-1 text-center transition short:gap-0.5 short:py-0.5 tall:gap-2 tall:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'border-primary shadow-glow shadow-primary/30' : 'border-line'} hover:border-primary/60`}
                >
                  <AbilityIcon
                    ability={ability}
                    className="size-6 shrink-0 text-primary short:size-5 tall:size-12"
                  />
                  <span className="font-display text-xs leading-tight font-bold text-primary sm:text-sm tiny:text-xs tall:text-lg">
                    {info.name}
                  </span>
                  {/* Em 2 linhas de 5, o celular deitado só tem altura para o ícone e o nome: a
                      descrição continua no nome acessível do botão */}
                  <span
                    className={`line-clamp-2 text-[0.625rem] leading-tight text-text-muted tiny:hidden tall:line-clamp-3 tall:text-sm ${manyAbilities ? 'short:hidden' : ''}`}
                  >
                    {info.description}
                  </span>
                  {selected && (
                    <span
                      className="absolute right-1 top-1 text-xs text-primary tall:right-2 tall:top-2 tall:text-base"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex shrink-0 flex-col items-center gap-1 tiny:mt-1 tall:mt-4 tall:gap-2">
            <p className="text-center text-[0.625rem] text-text-muted tiny:hidden sm:text-xs tall:text-sm">
              {DRAFT_TEXTS.shopHint}
            </p>
            <div className="flex items-center gap-2 tall:gap-3">
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
                disabled={
                  pickedAbilities.length !== INITIAL_ABILITIES_TO_PICK ||
                  isReady ||
                  confirming !== null
                }
              >
                {isReady
                  ? DRAFT_TEXTS.waitingOpponent
                  : confirming
                    ? 'Confirmando…'
                    : 'Confirmar habilidades'}
              </Button>
            </div>
          </div>
        </section>
      )}
      <p role="status" className="sr-only">
        {ready[opponentSlot] ? DRAFT_TEXTS.opponentReady : DRAFT_TEXTS.opponentChoosing}
      </p>
    </main>
  )
}

/** Reta final da Preparação: vermelho, porque é perigo de perder a escolha */
function TimeWarning({ seconds, missing }: { seconds: number; missing: string }) {
  return (
    <p role="alert" className="text-xs font-bold text-danger tall:text-sm">
      {DRAFT_TEXTS.timeWarning(seconds, missing)}
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
      className={`min-h-8 rounded-full border px-3 py-1 font-display text-[0.625rem] font-bold uppercase transition sm:px-4 sm:text-xs tall:min-h-10 tall:px-5 tall:text-sm ${active ? 'border-primary bg-primary/15 text-primary' : 'border-line text-text-muted hover:border-primary/50'} ${pending && !active ? 'border-primary text-primary motion-safe:animate-glow-pulse' : ''}`}
    >
      {children}
      {done ? ' ✓' : ''}
    </button>
  )
}
