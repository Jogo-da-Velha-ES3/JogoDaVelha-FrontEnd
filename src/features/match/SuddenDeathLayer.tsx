import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Banner } from '../../components/ui/Banner'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'

/** Duração total da entrada em ms (usada pelo useEffect para limpar o estado) */
const ENTRY_DURATION_MS = 2200

/**
 * Camada de efeitos da Morte Súbita (FE-13).
 * Montada na camada de overlays da Arena — pointer-events-none o tempo todo.
 *
 * Parte 1 — Entrada (dispara UMA VEZ quando suddenDeath vira true):
 *  - Flash vermelho rápido na tela
 *  - Tela treme (cancelado com reduced-motion)
 *  - Fitas de perigo entram por cima e por baixo
 *  - Banner "MORTE SÚBITA" bate na tela (reaproveitando <Banner tone="danger" flicker>)
 *
 * Parte 2 — Efeitos contínuos (enquanto suddenDeath && PLAYING):
 *  - Fitas de perigo correndo sem parar
 *
 * Parte 3 — Timer gigante:
 *  - Número grande mostrando segundos restantes do turno (5 → 0)
 *  - Bate a cada segundo (escala 1.45 → 1)
 */
export function SuddenDeathLayer() {
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const phase = useRoomStore((s) => s.phase)
  const reduceMotion = useReducedMotion()

  /**
   * `active` guarda se a entrada já rodou nesta montagem do componente.
   * Só ativa quando suddenDeath faz a transição false→true (não ao reconectar com
   * suddenDeath=true já presente, pois nesse caso roundStartedAt fica null).
   */
  const prevRef = useRef(suddenDeath)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const wasOff = !prevRef.current
    prevRef.current = suddenDeath

    if (wasOff && suddenDeath) {
      setActive(true)
      const timer = setTimeout(() => setActive(false), ENTRY_DURATION_MS)
      return () => clearTimeout(timer)
    }
  }, [suddenDeath])

  // Efeitos contínuos: só durante PLAYING ou ROUND_DRAW (round ativo)
  const ongoing = suddenDeath && (phase === 'PLAYING' || phase === 'ROUND_DRAW')

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          PARTE 1: ENTRADA
          ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Flash vermelho (reduzido-motion: oculto) ────────────────────────── */}
      <AnimatePresence>
        {active && !reduceMotion && (
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

      {/* ── Tremor da tela (reduzido-motion: oculto) ────────────────────────── */}
      <AnimatePresence>
        {active && !reduceMotion && (
          <motion.div
            aria-hidden="true"
            key="sd-shake"
            className="pointer-events-none absolute inset-0 z-[19]"
            animate={{ x: [0, -6, 6, -4, 4, -2, 2, 0] }}
            transition={{ duration: 0.45 }}
          />
        )}
      </AnimatePresence>

      {/* ── Fita de perigo — topo (entrada) ──────────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <motion.div
            aria-hidden="true"
            key="sd-tape-top-entry"
            className="pointer-events-none absolute inset-x-0 top-0 z-[21] h-3 short:h-[10px]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, var(--color-danger) 0 7px, #150306 7px 14px)',
              backgroundSize: '19.8px 19.8px',
            }}
            initial={{ y: '-100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ── Fita de perigo — base (entrada) ──────────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <motion.div
            aria-hidden="true"
            key="sd-tape-bottom-entry"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[21] h-3 short:h-[10px]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, var(--color-danger) 0 7px, #150306 7px 14px)',
              backgroundSize: '19.8px 19.8px',
            }}
            initial={{ y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ── Banner "MORTE SÚBITA" ─────────────────────────────────────────────
           Reutiliza o componente <Banner tone="danger" flicker> existente.
           Aparece junto com as fitas e sai ao mesmo tempo.               */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="sd-banner-wrapper"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-[22] w-full -translate-y-1/2"
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <Banner
              show
              title="Morte Súbita"
              subtitle="5 segundos por jogada"
              tone="danger"
              flicker
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          PARTE 2: EFEITOS CONTÍNUOS
          ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Efeito pulsante vermelho na tela (durante o jogo) ──────────────── */}
      {ongoing && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[6] animate-[beat_0.85s_infinite]"
          style={{
            boxShadow: 'inset 0 0 70px 16px rgba(255, 30, 50, 0.65)',
          }}
        />
      )}

      {/* ── Fitas de perigo correndo sem parar (enquanto ongoing) ─────────────
           Animação de scroll do background, conforme esboço .tape            */}
      {ongoing && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-[21] h-3 short:h-[10px] motion-safe:animate-[var(--animate-sd-tape)]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, var(--color-danger) 0 7px, #150306 7px 14px)',
              backgroundSize: '19.8px 19.8px',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[21] h-3 short:h-[10px] motion-safe:animate-[var(--animate-sd-tape)]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, var(--color-danger) 0 7px, #150306 7px 14px)',
              backgroundSize: '19.8px 19.8px',
            }}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PARTE 3: TIMER GIGANTE
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Timer gigante movido para dentro da coluna direita da Arena (Arena.tsx) */}
    </>
  )
}
