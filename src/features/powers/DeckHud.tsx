import { useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { sendCommand } from '../../sockets/gameClient'
import { usePowersStore, type Aim } from '../../stores/powersStore'
import { useRoomStore } from '../../stores/roomStore'
import type { AbilityId, DeckSlot } from '../../types/game'

interface DeckHudProps {
  deck: readonly DeckSlot[]
  canUse: boolean
  silenced: boolean
  aim: Aim | null
}

/** Mostra somente o deck privado confirmado pelo servidor e permite iniciar uma intenção. */
export function DeckHud({ deck, canUse, silenced, aim }: DeckHudProps) {
  const [confirming, setConfirming] = useState<AbilityId | null>(null)
  const [pending, setPending] = useState<{
    ability: AbilityId
    error: unknown
  } | null>(null)
  const roomError = useRoomStore((s) => s.lastError)
  const startAim = usePowersStore((s) => s.startAim)
  const cancelAim = usePowersStore((s) => s.cancelAim)

  const pendingResolved =
    pending !== null &&
    (roomError !== pending.error ||
      deck.some((slot) => slot.ability === pending.ability && slot.usedThisRound) ||
      !canUse)
  const activePending = pendingResolved ? null : pending

  const selectAbility = (ability: AbilityId) => {
    const slot = deck.find((item) => item.ability === ability)
    if (!canUse || silenced || !slot || slot.usedThisRound || activePending) return

    if (ABILITY_INFO[ability].target === 'NONE') {
      cancelAim()
      setConfirming(ability)
      return
    }

    startAim(ability)
  }

  const confirmUse = () => {
    if (!confirming) return
    const slot = deck.find((item) => item.ability === confirming)
    if (!canUse || silenced || activePending || !slot || slot.usedThisRound) {
      setConfirming(null)
      return
    }

    setPending({ ability: confirming, error: roomError })
    sendCommand({ type: 'USE_ABILITY', payload: { ability: confirming } })
    setConfirming(null)
  }

  return (
    <>
      <section aria-label="Seu deck" className="mt-auto flex min-h-0 flex-1 flex-col gap-2">
        <ul className="flex min-h-0 flex-1 flex-col gap-2">
          {deck.map((slot) => {
            const info = ABILITY_INFO[slot.ability]
            const glyph = ABILITY_GLYPHS[slot.ability]
            const selected = aim?.ability === slot.ability
            const isPending = activePending?.ability === slot.ability
            const disabled =
              !canUse ||
              silenced ||
              slot.usedThisRound ||
              Boolean(activePending) ||
              deck.length !== 3

            return (
              <li key={slot.ability} className="flex">
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${info.name}, ${info.kind.toLowerCase()}${slot.source === 'DRAWN' ? ', sorteada' : ''}${slot.usedThisRound ? ', usada' : ''}`}
                  disabled={disabled}
                  onClick={() => selectAbility(slot.ability)}
                  className={`flex min-h-24 w-full flex-col justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary short:min-h-20 short:px-2 short:py-1 ${slot.usedThisRound ? 'border-line bg-bg-deep/60 opacity-40' : selected ? 'border-primary bg-primary/15 shadow-glow shadow-primary/20' : 'border-line bg-bg-raised hover:border-primary/70'} disabled:pointer-events-none disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-lg leading-none short:text-base"
                      >
                        {glyph}
                      </span>
                      <span className="font-display text-sm leading-tight font-extrabold text-primary uppercase short:text-xs">
                        {info.name}
                      </span>
                    </span>
                    {slot.source === 'DRAWN' && (
                      <span className="shrink-0 rounded-full border border-coin/60 px-1.5 py-0.5 font-display text-[9px] font-bold text-coin uppercase">
                        Sorteada
                      </span>
                    )}
                  </span>
                  <span className="font-display text-[10px] font-semibold tracking-wide text-text-muted uppercase short:text-[9px]">
                    {isPending ? 'Enviando…' : slot.usedThisRound ? 'Usada' : info.kind}
                  </span>
                  <span className="text-xs leading-snug text-text-muted short:text-[10px]">
                    {info.description}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {deck.length !== 3 && (
          <p role="status" className="text-center text-xs text-text-muted">
            Aguardando o deck do servidor…
          </p>
        )}
        {silenced && canUse && (
          <p role="status" className="text-center text-xs text-danger">
            Silenciado: sem habilidades neste turno.
          </p>
        )}
        {activePending && (
          <p role="status" className="text-center text-xs text-text-muted">
            Aguardando confirmação do servidor…
          </p>
        )}
        {aim && (
          <Button size="sm" variant="ghost" onClick={cancelAim}>
            Cancelar mira
          </Button>
        )}
      </section>

      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={`Usar ${confirming ? ABILITY_INFO[confirming].name : 'habilidade'}?`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmUse} disabled={!canUse || silenced || Boolean(pending)}>
              Confirmar uso
            </Button>
          </>
        }
      >
        <p>Esta habilidade não precisa de alvo. Confirmar o uso?</p>
      </Modal>
    </>
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
