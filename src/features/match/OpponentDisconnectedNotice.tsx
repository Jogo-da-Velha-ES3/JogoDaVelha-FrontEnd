import { CHARACTER_INFO } from '../../constants/characters'
import { MAX_CONSECUTIVE_TIMEOUTS } from '../../constants/game'
import { ARENA_TEXTS } from '../../constants/texts'
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
 * Só a informação, numa linha, para sobrar espaço para o Vitão logo abaixo: a piada da queda é
 * dele, no balão (decidido em 02/11).
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
      className="flex items-baseline justify-between gap-2 rounded-xl border-2 border-dashed bg-bg-raised px-2 py-1"
      style={{ borderColor: oppColor, color: oppColor }}
    >
      <p className="min-w-0 font-display text-xs leading-tight font-bold tracking-wide uppercase">
        {ARENA_TEXTS.opponentDisconnected.title}
      </p>
      <p className="shrink-0 font-mono text-[10px]">
        {consecutiveTimeouts}/{MAX_CONSECUTIVE_TIMEOUTS}
      </p>
    </div>
  )
}
