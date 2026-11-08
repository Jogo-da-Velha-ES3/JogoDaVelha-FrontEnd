import { AnimatePresence, motion } from 'framer-motion'
import { CHARACTER_INFO } from '../../constants/characters'
import { MAX_CONSECUTIVE_TIMEOUTS } from '../../constants/game'
import { ARENA_TEXTS } from '../../constants/texts'
import { useIsBefore } from '../../hooks/useIsBefore'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'

const TOAST_MS = 3000

/**
 * Toast de aviso de turno perdido, fiel ao esboço (estado "Perdeu a vez"):
 *
 *   [!] Seu tempo acabou (1/3). Com 3 estouros seguidos você perde a partida.
 *
 * Aparece quando o servidor manda TURN_TIMEOUT → matchStore.lastTimeout.
 * Nunca dispara porque o timer do front chegou a 0 [PROJECT_CONTEXT §9].
 *
 * Só a informação (ex: "Tempo esgotado! · 1/3"): a piada do 1º e do 2º estouro é do Vitão (FE-43).
 *
 * Cor: vermelho para quem estoura; cor do personagem do oponente para quem vê o estouro alheio.
 * Some automaticamente após 3s.
 *
 * Fica na coluna direita da Arena, como o aviso de habilidade: no topo, cobria o tabuleiro, o
 * rótulo do round e a faixa do oponente (corrigido em 02/11).
 */
export function TurnTimeoutToast() {
  const mySlot = useRoomStore((s) => s.mySlot) ?? 'P1'
  const players = useRoomStore((s) => s.players)
  const lastTimeout = useMatchStore((s) => s.lastTimeout)

  // 3s a partir da chegada do TURN_TIMEOUT (cada estouro novo tem o seu receivedAt)
  const visible = useIsBefore(lastTimeout ? lastTimeout.receivedAt + TOAST_MS : null)

  if (!lastTimeout) return null

  const isMyTimeout = lastTimeout.player === mySlot
  const count = lastTimeout.consecutiveTimeouts

  // O W.O. é tratado pelo Banner de outcome em Arena.tsx; este toast só cobre os estouros 1/3 e 2/3
  if (count >= MAX_CONSECUTIVE_TIMEOUTS) return null

  // Cor: vermelho para quem estoura; cor do personagem do jogador que estoura para o outro
  const toasterPlayer = players.find((p) => p.slot === lastTimeout.player)
  const toasterColor = toasterPlayer?.character
    ? CHARACTER_INFO[toasterPlayer.character].color
    : 'var(--color-danger)'
  const borderColor = isMyTimeout ? 'var(--color-danger)' : toasterColor

  // Só a informação, conforme a tabela do PROJECT_CONTEXT §9 (1/3 e 2/3; o W.O. fica no Banner)
  const T = ARENA_TEXTS.timeout
  const title = isMyTimeout ? T.title : T.opponentTitle
  const subtitle = T.count(count)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={lastTimeout.receivedAt}
          role="status"
          aria-live="assertive"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="pointer-events-none flex items-center gap-2 rounded-xl border bg-bg-panel px-2.5 py-1.5 shadow-glow short:py-1"
          style={{ borderColor }}
        >
          {/* Ícone de aviso */}
          <span
            aria-hidden="true"
            className="shrink-0 font-display text-lg font-bold leading-none"
            style={{ color: borderColor }}
          >
            !
          </span>

          <div className="min-w-0 flex-1">
            <p
              className="font-display text-sm font-bold uppercase leading-tight tracking-wide short:text-xs"
              style={{ color: borderColor }}
            >
              {title}
            </p>
            <p className="font-body text-xs text-text-muted short:text-[11px] short:leading-tight">
              {subtitle}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
