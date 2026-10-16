import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CHARACTER_INFO } from '../../constants/characters'
import { ROUND_BANNER_SECONDS, ROUND_COIN_FLIP_SECONDS } from '../../constants/game'
import { useIsBefore } from '../../hooks/useIsBefore'
import { isMatchPoint, otherSlot } from '../../lib/match'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import type { CharacterId, PlayerSlot } from '../../types/game'
import { Character } from '../characters'

const colorOf = (char: CharacterId | null | undefined) =>
  char ? CHARACTER_INFO[char].color : 'var(--color-line)'

function Avatar({
  character,
  color,
}: {
  character: CharacterId | null | undefined
  color: string
}) {
  return (
    <span
      className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-bg-raised"
      style={{ borderColor: color, boxShadow: `0 0 8px ${color}` }}
    >
      {character ? (
        <Character id={character} variant="piece" decorative className="size-[78%]" />
      ) : null}
    </span>
  )
}

/**
 * Banner de início de round — visual do esboço, estado "Início do round" (`.ov-banner`,
 * `.flip`, `.coin-big`). Aparece nos primeiros segundos de cada round (a partir da chegada do
 * ROUND_START), para não cobrir o sorteio da 3ª habilidade. Quem reconecta não vê o banner.
 * No round 1, a moeda gira um pouco antes de revelar quem começa (sorteado pelo servidor).
 */
export function RoundStartBanner() {
  const reduceMotion = useReducedMotion()
  const phase = useRoomStore((s) => s.phase)
  const players = useRoomStore((s) => s.players)
  const mySlot = useRoomStore((s) => s.mySlot) ?? 'P1'
  const round = useMatchStore((s) => s.round)
  const score = useMatchStore((s) => s.score)
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const starter = useMatchStore((s) => s.startingPlayer)
  const startedAt = useMatchStore((s) => s.roundStartedAt)

  const visible = useIsBefore(startedAt !== null ? startedAt + ROUND_BANNER_SECONDS * 1000 : null)
  const flipping = useIsBefore(
    startedAt !== null && round === 1 ? startedAt + ROUND_COIN_FLIP_SECONDS * 1000 : null,
  )
  const show = visible && (phase === 'ROUND_DRAW' || phase === 'PLAYING')
  const matchPoint = isMatchPoint(score)

  const me = players.find((p) => p.slot === mySlot)
  const opp = players.find((p) => p.slot !== mySlot)
  const oppSlot: PlayerSlot = otherSlot(mySlot)

  const starterIsMe = starter === mySlot
  const starterPlayer = starterIsMe ? me : opp
  const starterColor = colorOf(starterPlayer?.character)
  const starterName = starterPlayer?.nickname ?? (starterIsMe ? 'Você' : 'Oponente')

  const leadSlot: PlayerSlot | null =
    score[mySlot] > score[oppSlot] ? mySlot : score[oppSlot] > score[mySlot] ? oppSlot : null
  const leadPlayer = leadSlot ? players.find((p) => p.slot === leadSlot) : null
  const leadName = leadPlayer?.nickname ?? (leadSlot === mySlot ? 'Você' : 'Oponente')
  const leadColor = colorOf(leadPlayer?.character)

  const myColor = colorOf(me?.character)
  const oppColor = colorOf(opp?.character)

  return (
    <AnimatePresence>
      {show && suddenDeath && (
        <motion.div
          key="sudden-death"
          role="status"
          aria-label={`Morte Súbita${matchPoint ? ` · Match Point de ${leadName}` : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-bg-deep/85 text-center"
        >
          {/* Texto principal: animação de slam do esboço (.slam) */}
          <motion.p
            initial={{ scale: 2.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
            className="font-display text-[42px] leading-none font-bold tracking-[0.05em] text-primary uppercase"
            style={{
              textShadow:
                '3px 0 var(--color-danger), -3px 0 var(--color-danger), 0 0 30px var(--color-danger)',
            }}
          >
            Morte Súbita
          </motion.p>

          {/* Subtexto na cor do perigo, letras bem espaçadas */}
          <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-danger uppercase">
            5 Segundos por jogada
          </p>
        </motion.div>
      )}

      {show && !suddenDeath && (
        <motion.div
          key="round-start"
          role="status"
          aria-label={`${matchPoint ? `Match Point de ${leadName}` : `Round ${round}`}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-[7px] bg-bg-deep/75 px-3.5 py-3.5 text-center"
        >
          <p className="font-mono text-[9.5px] tracking-[0.06em] text-text-muted uppercase">
            Melhor de 3
          </p>

          {matchPoint ? (
            <p
              className="font-display text-[30px] leading-none font-bold tracking-[0.08em] uppercase"
              style={{ color: leadColor, textShadow: `0 0 18px ${leadColor}` }}
            >
              Match Point · {leadName}
            </p>
          ) : (
            <p className="font-display text-[30px] leading-none font-bold tracking-[0.08em] text-text uppercase">
              Round {round}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-2.5" style={{ perspective: 240 }}>
            <Avatar character={me?.character} color={myColor} />
            {round === 1 ? (
              <motion.span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full border-2 border-coin font-display text-[17px] font-bold text-coin"
                style={{ boxShadow: '0 0 16px var(--color-coin)' }}
                animate={reduceMotion || !flipping ? { rotateY: 0 } : { rotateY: 360 }}
                transition={
                  reduceMotion || !flipping
                    ? { duration: 0 }
                    : { repeat: Infinity, duration: 0.7, ease: 'linear' }
                }
              >
                ?
              </motion.span>
            ) : (
              <span className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
                ⇄
              </span>
            )}
            <Avatar character={opp?.character} color={oppColor} />
          </div>

          {/* Round 1: primeiro a moeda gira, depois revela quem começa */}
          {round === 1 && flipping ? (
            <p className="font-mono text-[9.5px] tracking-[0.06em] text-text-muted">
              sorteando quem começa…
            </p>
          ) : (
            <>
              {round > 1 && (
                <p className="font-mono text-[9.5px] tracking-[0.06em] text-text-muted">
                  alterna a cada round
                </p>
              )}
              {starter && (
                <p
                  className="font-display text-sm font-bold tracking-[0.06em] uppercase"
                  style={{ color: starterColor }}
                >
                  {starterIsMe ? 'Você começa' : `${starterName} começa`}
                </p>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
