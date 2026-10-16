import { AnimatePresence, motion } from 'framer-motion'
import { Button, TimerBar } from '../../components/ui'
import { CHARACTER_INFO } from '../../constants/characters'
import { useRoomStore } from '../../stores/roomStore'
import { useTimerStore } from '../../stores/timerStore'

interface PauseOverlayProps {
  open: boolean
  onClose: () => void
  onHowToPlay: () => void
  onSettings: () => void
  onQuit: () => void
}

/**
 * Overlay de pausa fiel ao esboço (estado "Menu de pausa"):
 * card central com título MENU, timer correndo no topo, e os 4 botões em grid 2×2.
 * O timer do servidor CONTINUA correndo — o menu é só um overlay visual [PROJECT_CONTEXT §6].
 */
export function PauseOverlay({
  open,
  onClose,
  onHowToPlay,
  onSettings,
  onQuit,
}: PauseOverlayProps) {
  const turn = useTimerStore((s) => s.turn)
  const players = useRoomStore((s) => s.players)
  const mySlot = useRoomStore((s) => s.mySlot) ?? 'P1'

  // Cor da barra = cor do personagem de quem é o turno atual
  const turnPlayer = players.find((p) => p.slot === turn?.player)
  const timerColor = turnPlayer?.character ? CHARACTER_INFO[turnPlayer.character].color : undefined
  const isMyTurn = turn?.player === mySlot

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim de fundo */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-10 bg-bg-deep/80 backdrop-blur-sm"
          />

          {/* Card central — replica .ov-card do esboço */}
          <motion.div
            role="dialog"
            aria-label="Menu de pausa"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute inset-x-[18%] top-1/2 z-10 -translate-y-1/2 rounded-2xl border border-line bg-bg-panel p-3 shadow-glow-lg short:inset-x-[12%] short:p-2.5"
          >
            {/* Título */}
            <p className="mb-2 font-display text-base font-bold tracking-widest uppercase text-text">
              Menu
            </p>

            {/* Timer — continua correndo */}
            <TimerBar
              deadline={turn}
              color={timerColor}
              warnAtSeconds={isMyTurn ? 3 : 0}
              label="Timer do turno (continua durante a pausa)"
              className="mb-3"
            />

            {/* 4 botões em grid 2×2 */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" size="sm" block onClick={onClose}>
                Voltar ao Jogo
              </Button>
              <Button variant="secondary" size="sm" block onClick={onHowToPlay}>
                Como Jogar
              </Button>
              <Button variant="secondary" size="sm" block onClick={onSettings}>
                Configurações
              </Button>
              <Button variant="danger" size="sm" block onClick={onQuit}>
                Desistir
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
