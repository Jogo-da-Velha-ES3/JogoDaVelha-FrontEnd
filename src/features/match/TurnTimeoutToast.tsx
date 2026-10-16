import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import { MAX_CONSECUTIVE_TIMEOUTS } from '../../constants/game'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'

/**
 * Toast de aviso de turno perdido, fiel ao esboço (estado "Perdeu a vez"):
 *
 *   [!] Seu tempo acabou (1/3). Com 3 estouros seguidos você perde a partida.
 *
 * Aparece quando o servidor manda TURN_TIMEOUT → matchStore.lastTimeout.
 * Nunca dispara porque o timer do front chegou a 0 [PROJECT_CONTEXT §9].
 *
 * Cor: vermelho para quem estoura; cor do personagem do oponente para quem vê o estouro alheio.
 * Some automaticamente após 3s.
 */
export function TurnTimeoutToast() {
  const mySlot = useRoomStore((s) => s.mySlot) ?? 'P1'
  const players = useRoomStore((s) => s.players)
  const lastTimeout = useMatchStore((s) => s.lastTimeout)

  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastServerTime = useRef<number | null>(null)

  useEffect(() => {
    if (!lastTimeout) return
    // serverTime diferencia dois toasts consecutivos com o mesmo texto (ex: 1/3 em rounds diferentes)
    if (lastTimeout.serverTime === lastServerTime.current) return
    lastServerTime.current = lastTimeout.serverTime

    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 3000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [lastTimeout])

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

  // Texto conforme a tabela do PROJECT_CONTEXT §9 (só para 1/3 e 2/3; W.O. fica no Banner)
  let title: string
  let subtitle: string
  if (isMyTimeout) {
    title = 'Tempo Esgotado!'
    subtitle = count === 1 ? 'Você perdeu a vez · 1/3' : '2/3 · Mais um e é W.O.!'
  } else {
    title = 'Oponente perdeu a vez'
    subtitle = `${count}/3`
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="assertive"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="pointer-events-none absolute top-2 left-[26%] right-[22%] z-20 flex items-center gap-2.5 rounded-xl border bg-bg-panel px-3 py-2 shadow-glow short:left-[18%] short:right-[16%]"
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
              className="font-display text-sm font-bold uppercase leading-tight tracking-wide"
              style={{ color: borderColor }}
            >
              {title}
            </p>
            <p className="font-body text-xs text-text-muted">{subtitle}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
