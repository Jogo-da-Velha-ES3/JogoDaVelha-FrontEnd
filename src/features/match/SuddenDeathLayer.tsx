import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Banner } from '../../components/ui/Banner'
import { ARENA_TEXTS, joinParts } from '../../constants/texts'
import { useVoice } from '../../hooks/useLanguageFilter'
import { useServerTimer } from '../../hooks/useServerTimer'
import { useSuddenDeathSounds } from '../../hooks/useSuddenDeathSounds'
import { useSuddenDeathVibration } from '../../hooks/useVibration'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { useTimerStore } from '../../stores/timerStore'
import { useSuddenDeathEntrance } from './useSuddenDeathEntrance'

/** Listras das fitas de perigo: vermelho de perigo e o fundo do tema */
const TAPE_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, var(--color-danger) 0 7px, var(--color-bg-deep) 7px 14px)',
  backgroundSize: '19.8px 19.8px',
}

/**
 * Camada de efeitos da Morte Súbita (FE-13), na camada de avisos da Arena (sem receber toques).
 *
 * - Entrada (primeiros segundos do round 3): flash vermelho, fitas de perigo entrando por cima e
 *   por baixo e o banner "MORTE SÚBITA". O tremor é da Arena inteira (classe no Arena.tsx).
 * - Durante o round: bordas pulsando como batimento cardíaco.
 * - Vibração e ganchos de som: ficam aqui, com o timer só ligado na Morte Súbita, para a Arena
 *   não re-renderizar a cada 100ms a partida inteira.
 */
export function SuddenDeathLayer() {
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const phase = useRoomStore((s) => s.phase)
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const turn = useTimerStore((s) => s.turn)
  const entering = useSuddenDeathEntrance()
  const reduceMotion = useReducedMotion()
  const voice = useVoice()

  const timer = useServerTimer(suddenDeath ? turn : null)
  const seconds = timer?.remainingSeconds ?? null
  const playing = phase === 'PLAYING'
  useSuddenDeathVibration(seconds, playing && turn?.player === me, suddenDeath)
  useSuddenDeathSounds(suddenDeath, seconds, playing, entering)

  // Bordas pulsando: durante o round 3 em andamento
  const ongoing = suddenDeath && (phase === 'PLAYING' || phase === 'ROUND_DRAW')

  return (
    <>
      {/* ── Entrada: flash vermelho (sem flash com "reduzir movimento") ── */}
      <AnimatePresence>
        {entering && !reduceMotion && (
          <motion.div
            aria-hidden="true"
            key="sd-flash"
            className="pointer-events-none absolute inset-0 z-20 bg-danger"
            initial={{ opacity: 0.55 }}
            animate={{ opacity: [0.55, 0.3, 0.55, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', times: [0, 0.3, 0.55, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ── Entrada: fitas de perigo por cima e por baixo, correndo ── */}
      <AnimatePresence>
        {entering && (
          <motion.div
            aria-hidden="true"
            key="sd-tape-top"
            className="pointer-events-none absolute inset-x-0 top-0 z-[21] h-3 motion-safe:animate-sd-tape short:h-[10px]"
            style={TAPE_STYLE}
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {entering && (
          <motion.div
            aria-hidden="true"
            key="sd-tape-bottom"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[21] h-3 motion-safe:animate-sd-tape short:h-[10px]"
            style={TAPE_STYLE}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ── Entrada: banner "MORTE SÚBITA" (o Banner entra e sai sozinho pelo `show`) ── */}
      <Banner
        className="absolute inset-x-0 top-1/2 z-[22] w-full -translate-y-1/2"
        show={entering}
        title={ARENA_TEXTS.suddenDeath.title}
        subtitle={joinParts(voice(ARENA_TEXTS.suddenDeath.line), ARENA_TEXTS.suddenDeath.perMove)}
        tone="danger"
        flicker
      />

      {/* ── Durante o round: bordas pulsando como batimento cardíaco ── */}
      {ongoing && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[6] shadow-[inset_0_0_70px_16px] shadow-danger/65 motion-safe:animate-sd-beat"
        />
      )}
    </>
  )
}
