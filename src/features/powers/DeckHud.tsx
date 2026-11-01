import { useId, useState, type CSSProperties } from 'react'
import { Button, Modal } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { DECK_SIZE } from '../../constants/game'
import { ABILITY_TEXTS } from '../../constants/texts'
import { useVoice } from '../../hooks/useLanguageFilter'
import { sendCommand } from '../../sockets/gameClient'
import { usePowersStore, type Aim } from '../../stores/powersStore'
import { useRoomStore } from '../../stores/roomStore'
import type { AbilityId, DeckSlot } from '../../types/game'
import { AbilityIcon } from './AbilityIcon'

interface DeckHudProps {
  deck: readonly DeckSlot[]
  /** Minha vez e conectado: as cartas aceitam toque */
  canUse: boolean
  silenced: boolean
  aim: Aim | null
  /** A mira já mandou o alvo e espera o servidor (FE-27) */
  aimPending?: boolean
  /** Habilidades com alvo sem nenhum alvo válido agora: a carta fica desabilitada ("Sem alvo") */
  withoutTarget?: readonly AbilityId[]
  /** Início do turno atual (timestamp do servidor): um envio só fica pendente no turno em que saiu */
  turnKey: number | null
  /** Cor do meu personagem (cor do lado) */
  color?: string
}

/**
 * Deck da rodada na coluna direita da Arena (FE-11). Mostra só o deck confirmado pelo servidor e
 * envia a intenção [RN-ARN-02]: "Enviando…" não marca a carta como usada, quem marca é o
 * DECK_UPDATE. Habilidade com alvo só inicia a mira (FE-27); sem alvo, pede confirmação e envia.
 * Sem descrição na partida, para caber no celular deitado: ela aparece na Preparação e no sorteio.
 */
export function DeckHud({
  deck,
  canUse,
  silenced,
  aim,
  aimPending = false,
  withoutTarget = [],
  turnKey,
  color,
}: DeckHudProps) {
  const descriptionId = useId()
  const voice = useVoice()
  const lastError = useRoomStore((s) => s.lastError)
  const startAim = usePowersStore((s) => s.startAim)
  const cancelAim = usePowersStore((s) => s.cancelAim)
  const [confirming, setConfirming] = useState<{ ability: AbilityId; turnKey: number | null }>()
  // O envio e o último erro conhecido naquele momento: um erro novo, outro turno ou a carta marcada
  // como usada pelo servidor encerram a espera
  const [sent, setSent] = useState<{
    ability: AbilityId
    turnKey: number | null
    error: typeof lastError
  }>()

  const ready = deck.length === DECK_SIZE
  const pending =
    aimPending && aim
      ? aim.ability
      : sent &&
          sent.turnKey === turnKey &&
          sent.error === lastError &&
          !deck.some((slot) => slot.ability === sent.ability && slot.usedThisRound)
        ? sent.ability
        : null
  const blocked = !canUse || silenced || !ready || pending !== null
  const noTarget = (slot: DeckSlot) =>
    !blocked && !slot.usedThisRound && withoutTarget.includes(slot.ability)
  const usable = (slot: DeckSlot | undefined): slot is DeckSlot =>
    slot !== undefined && !blocked && !slot.usedThisRound && !noTarget(slot)
  const confirmingNow = confirming?.turnKey === turnKey ? confirming.ability : null

  const select = (slot: DeckSlot) => {
    if (!usable(slot)) return
    if (ABILITY_INFO[slot.ability].target === 'NONE') {
      cancelAim()
      setConfirming({ ability: slot.ability, turnKey })
    } else if (aim?.ability === slot.ability) {
      cancelAim()
    } else {
      startAim(slot.ability)
    }
  }

  const confirmUse = () => {
    setConfirming(undefined)
    const slot = deck.find((item) => item.ability === confirmingNow)
    if (!usable(slot)) return
    setSent({ ability: slot.ability, turnKey, error: lastError })
    sendCommand({ type: 'USE_ABILITY', payload: { ability: slot.ability } })
  }

  return (
    <>
      <section
        aria-label="Seu deck"
        style={{ '--side': color ?? 'var(--color-primary)' } as CSSProperties}
        className="mt-auto flex min-h-0 flex-col gap-1.5"
      >
        <ul className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
          {deck.map((slot) => {
            const info = ABILITY_INFO[slot.ability]
            const selected = aim?.ability === slot.ability
            const status =
              pending === slot.ability
                ? 'Enviando…'
                : slot.usedThisRound
                  ? 'Usada'
                  : silenced
                    ? 'Silenciada'
                    : noTarget(slot)
                      ? 'Sem alvo'
                      : info.kind

            return (
              <li key={slot.ability} className="flex">
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${info.name}, ${info.kind.toLowerCase()}${slot.source === 'DRAWN' ? ', sorteada' : ''}${slot.usedThisRound ? ', usada' : silenced ? ', silenciada' : noTarget(slot) ? ', sem alvo' : ''}`}
                  aria-describedby={`${descriptionId}-${slot.ability}`}
                  disabled={!usable(slot)}
                  onClick={() => select(slot)}
                  className={[
                    'flex w-full flex-col gap-0.5 rounded-xl border-2 px-2.5 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary short:px-2 short:py-1',
                    slot.usedThisRound
                      ? 'border-line bg-bg-deep/60 opacity-40'
                      : silenced
                        ? 'border-danger/50 bg-bg-raised opacity-60'
                        : selected
                          ? 'border-(--side) bg-(--side)/15 shadow-glow shadow-(color:--side)/25'
                          : usable(slot)
                            ? 'border-line bg-bg-raised hover:border-(--side)/70'
                            : 'border-line bg-bg-raised opacity-70',
                  ].join(' ')}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <AbilityIcon
                        ability={slot.ability}
                        className="size-5 text-(--side) short:size-4"
                      />
                      <span className="truncate font-display text-sm leading-tight font-extrabold text-(--side) uppercase short:text-xs">
                        {info.name}
                      </span>
                    </span>
                    {slot.source === 'DRAWN' && (
                      <span className="shrink-0 rounded-full border border-coin/60 px-1.5 py-0.5 font-display text-[9px] font-bold text-coin uppercase">
                        Sorteada
                      </span>
                    )}
                  </span>
                  <span
                    className={`font-display text-[10px] font-semibold tracking-wide uppercase short:text-[9px] ${silenced && !slot.usedThisRound ? 'text-danger' : 'text-text-muted'}`}
                  >
                    {status}
                  </span>
                  <span id={`${descriptionId}-${slot.ability}`} className="sr-only">
                    {info.description}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {deck.length > 0 && !ready && (
          <p role="status" className="text-center text-xs text-text-muted">
            {ABILITY_TEXTS.deck.waitingDeck}
          </p>
        )}
        {silenced && canUse && (
          <p role="status" className="text-center text-xs text-danger">
            {voice(ABILITY_TEXTS.deck.silenced)}
          </p>
        )}
        {pending && (
          <p role="status" className="text-center text-xs text-text-muted">
            {ABILITY_TEXTS.deck.waitingConfirmation}
          </p>
        )}
        {aim && pending === null && (
          <Button size="sm" variant="ghost" onClick={cancelAim}>
            Cancelar mira
          </Button>
        )}
      </section>

      <Modal
        open={confirmingNow !== null}
        onClose={() => setConfirming(undefined)}
        title={ABILITY_TEXTS.deck.confirmTitle(
          confirmingNow ? ABILITY_INFO[confirmingNow].name : 'habilidade',
        )}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirming(undefined)}>
              Cancelar
            </Button>
            <Button onClick={confirmUse} disabled={blocked}>
              Confirmar uso
            </Button>
          </>
        }
      >
        <p>{confirmingNow && ABILITY_INFO[confirmingNow].description}</p>
      </Modal>
    </>
  )
}
