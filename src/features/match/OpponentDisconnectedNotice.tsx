import { CHARACTER_INFO } from '../../constants/characters'
import { MAX_CONSECUTIVE_TIMEOUTS } from '../../constants/game'
import { otherSlot } from '../../lib/match'
import { useRoomStore } from '../../stores/roomStore'
import { useOpponentDisconnect } from './useOpponentDisconnect'

/**
 * Aviso de oponente desconectado, logo abaixo da faixa dele. Fica fora do tabuleiro: quem ficou
 * continua jogando os próprios turnos.
 *
 * Sem contagem regressiva — os turnos do oponente continuam correndo normalmente:
 * 3 estouros seguidos resultam em W.O., como no tempo esgotado (regra fechada com o back).
 *
 * Cor: do personagem do oponente. Sem vermelho — para quem ficou isso não é perigo.
 */
export function OpponentDisconnectedNotice() {
  const { disconnected, consecutiveTimeouts } = useOpponentDisconnect()
  const mySlot = useRoomStore((s) => s.mySlot) ?? 'P1'
  const opp = useRoomStore((s) => s.players.find((p) => p.slot === otherSlot(mySlot)))

  if (!disconnected) return null

  const oppColor = opp?.character ? CHARACTER_INFO[opp.character].color : 'var(--color-primary)'

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-0.5 rounded-xl border-2 border-dashed bg-bg-raised px-2 py-1.5"
      style={{ borderColor: oppColor }}
    >
      <p
        className="font-display text-xs leading-tight font-bold tracking-wide uppercase"
        style={{ color: oppColor }}
      >
        Oponente desconectado
      </p>
      <p className="font-mono text-[10px] text-text-muted">
        Os turnos dele continuam correndo ·{' '}
        <span style={{ color: oppColor }}>
          {consecutiveTimeouts}/{MAX_CONSECUTIVE_TIMEOUTS}
        </span>
      </p>
    </div>
  )
}
