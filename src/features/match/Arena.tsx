import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Banner } from '../../components/ui'
import { CHARACTER_INFO } from '../../constants/characters'
import { useServerTimer } from '../../hooks/useServerTimer'
import { otherSlot } from '../../lib/match'
import { PATHS } from '../../routes/paths'
import { sendCommand } from '../../sockets/gameClient'
import { useBoardStore } from '../../stores/boardStore'
import { useMatchStore } from '../../stores/matchStore'
import { usePowersStore } from '../../stores/powersStore'
import { useRoomStore } from '../../stores/roomStore'
import { useTimerStore } from '../../stores/timerStore'
import type { CharacterId, PlayerSlot } from '../../types/game'
import { Board } from '../board'
import { HowToPlayModal } from '../hub/HowToPlayModal'
import { DrawPicker } from '../powers/DrawPicker'
import { DeckHud } from '../powers/DeckHud'
import { VitaoSlot } from '../vitao/VitaoSlot'
import { OpponentDisconnectedNotice } from './OpponentDisconnectedNotice'
import { PauseOverlay } from './PauseOverlay'
import { PlayerStrip } from './PlayerStrip'
import { QuitModal } from './QuitModal'
import { RoundStartBanner } from './RoundStartBanner'
import { SuddenDeathLayer } from './SuddenDeathLayer'
import { useSuddenDeathEntrance } from './useSuddenDeathEntrance'
import { TurnTimeoutToast } from './TurnTimeoutToast'
import { VsBanner } from './VsBanner'

type ModalKind = 'howToPlay' | 'quit' | null

const colorOf = (character: CharacterId | null | undefined) =>
  character ? CHARACTER_INFO[character].color : undefined

export interface ArenaProps {
  /** "Desistir" no menu de pausa. Padrão: volta ao Hub (a sala avisa o servidor ao sair) */
  onQuit?: () => void
}

/**
 * Arena (FE-28 + FE-05), em paisagem: jogadores à esquerda, tabuleiro no centro com a
 * altura toda, aviso do turno e deck à direita. Só lê as stores e manda intenções.
 * Precisa de um pai com altura definida (a tela inteira na sala).
 */
export function Arena({ onQuit }: ArenaProps) {
  const navigate = useNavigate()
  const [pauseOpen, setPauseOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalKind>(null)

  const phase = useRoomStore((s) => s.phase)
  const players = useRoomStore((s) => s.players)
  const me: PlayerSlot = useRoomStore((s) => s.mySlot) ?? 'P1'
  // Caiu: nada de jogada até o snapshot da volta (o RoomPage mostra "Reconectando…") [FE-20]
  const reconnecting = useRoomStore((s) => s.connection === 'RECONNECTING')
  const opp = otherSlot(me)
  const round = useMatchStore((s) => s.round)
  const score = useMatchStore((s) => s.score)
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const timeouts = useMatchStore((s) => s.consecutiveTimeouts)
  const roundEnd = useMatchStore((s) => s.roundEnd)
  const outcome = useMatchStore((s) => s.outcome)
  const coins = useMatchStore((s) => s.coins)
  const enteringSuddenDeath = useSuddenDeathEntrance()
  const cells = useBoardStore((s) => s.cells)
  const winningLine = useBoardStore((s) => s.winningLine)
  const deck = usePowersStore((s) => s.deck)
  const aim = usePowersStore((s) => s.aim)
  const drawOptions = usePowersStore((s) => s.drawOptions)
  const turn = useTimerStore((s) => s.turn)

  const player = (slot: PlayerSlot) => players.find((p) => p.slot === slot)
  const characters = {
    P1: player('P1')?.character,
    P2: player('P2')?.character,
  }
  const myTurn = phase === 'PLAYING' && turn?.player === me
  const turnColor = colorOf(turn ? characters[turn.player] : null)
  const empty = cells.filter((c) => c.owner === null).map((c) => c.index)

  // Fim do round 3 com o placar igual (1×1 ou 0×0) é empate absoluto [RN-ARN-06] (regra de 18/10).
  // Só muda o banner: o resultado oficial chega no MATCH_END
  const absoluteDraw = suddenDeath && roundEnd !== null && score.P1 === score.P2

  // Botão de pausa visível durante fases ativas (não no VS nem no fim de round)
  const showPauseButton = phase === 'PLAYING' || phase === 'ROUND_DRAW'

  const roundLabel =
    phase === 'VERSUS'
      ? 'Confronto'
      : phase === 'ROUND_END'
        ? `Fim do round ${round}`
        : suddenDeath
          ? `Round ${round} · Morte Súbita`
          : `Round ${round} · MD3`

  const openModal = (kind: Exclude<ModalKind, null>) => {
    setPauseOpen(false)
    setActiveModal(kind)
  }

  // Ao fechar qualquer modal, volta a abrir a pausa
  const closeModalToPause = () => {
    setActiveModal(null)
    setPauseOpen(true)
  }

  const quit = () => {
    setActiveModal(null)
    if (onQuit) onQuit()
    else navigate(PATHS.play)
  }

  return (
    <>
      {/* Na entrada da Morte Súbita a Arena inteira treme (sem tremor com "reduzir movimento") */}
      <div
        className={`relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 short:gap-2 ${enteringSuddenDeath ? 'motion-safe:animate-sd-shake' : ''}`}
      >
        {/* ── Coluna esquerda: pausa, rótulo do round, faixas, Vitão ── */}
        <aside
          aria-label="Jogadores"
          className="flex min-h-0 min-w-0 flex-col gap-2 pl-3 short:pl-2"
        >
          <div className="flex items-center gap-2">
            {/* Botão de pausa — só nas fases ativas (z-[5]: fica clicável por cima do sorteio) */}
            {showPauseButton && (
              <button
                type="button"
                aria-label="Pausa"
                onClick={() => setPauseOpen(true)}
                className="relative z-[5] grid size-8 shrink-0 place-items-center rounded-lg border border-line font-mono text-sm text-text-muted transition hover:border-line hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                ⏸
              </button>
            )}
            <p
              className={`font-display text-sm font-bold tracking-wide uppercase ${suddenDeath ? 'text-danger' : 'text-text-muted'}`}
            >
              {roundLabel}
            </p>
          </div>

          <PlayerStrip
            player={player(opp)}
            isMe={false}
            active={phase === 'PLAYING' && turn?.player === opp}
            roundsWon={score[opp]}
            timeouts={timeouts[opp]}
          />
          {/* Fora do tabuleiro: quem ficou continua jogando os próprios turnos */}
          <OpponentDisconnectedNotice />
          <VitaoSlot />
          <PlayerStrip
            player={player(me)}
            isMe
            active={myTurn}
            roundsWon={score[me]}
            timeouts={timeouts[me]}
          />
        </aside>

        {/* ── Centro: tabuleiro ──
            Na Morte Súbita (round 3), o wrapper ganha borda em brasa e tremor leve. */}
        <div
          className={[
            'aspect-square h-full max-w-[55vw] min-h-0',
            suddenDeath ? 'rounded-lg border-2 border-danger motion-safe:animate-sd-board' : '',
          ].join(' ')}
        >
          <Board
            cells={cells}
            characters={characters}
            winningLine={winningLine}
            selectable={myTurn ? empty : []}
            disabled={reconnecting}
            onCellSelect={(cell) => sendCommand({ type: 'MOVE', payload: { cell } })}
          />
        </div>

        {/* ── Coluna direita: subtexto de vez + deck (o timer do turno fica na faixa) ── */}
        <aside
          aria-label="Turno e habilidades"
          className="flex min-h-0 min-w-0 flex-col gap-2 pr-3 short:pr-2"
        >
          {/* Timer gigante da Morte Súbita — no topo da coluna, antes do indicador de vez */}
          {suddenDeath && phase === 'PLAYING' && (
            <p
              role="timer"
              aria-live="polite"
              className="self-start font-display text-[62px] leading-[0.85] font-bold text-danger tabular-nums short:text-[42px]"
              style={{
                // Brilho vermelho e as cores dos dois personagens deslocadas (efeito do esboço)
                textShadow: `0 0 18px var(--color-danger), 3px 0 color-mix(in srgb, ${colorOf(characters[opp]) ?? 'var(--color-primary)'} 50%, transparent), -3px 0 color-mix(in srgb, ${colorOf(characters[me]) ?? 'var(--color-primary)'} 55%, transparent)`,
                transformOrigin: '30% 60%',
              }}
            >
              <SuddenDeathTimerValue />
            </p>
          )}

          {phase === 'PLAYING' && turn && (
            <div role="status">
              {myTurn ? (
                <>
                  {/* "SUA VEZ" em display + subtítulo instrucional
                      Na Morte Súbita: só "SUA VEZ" em vermelho, sem subtítulo */}
                  <p
                    className={`font-display text-xl leading-tight font-extrabold uppercase short:text-lg ${suddenDeath ? 'text-danger' : ''}`}
                    style={suddenDeath ? undefined : { color: turnColor }}
                  >
                    Sua vez
                  </p>
                  {!suddenDeath && (
                    <p className="mt-0.5 font-body text-xs text-text-muted">
                      Toque numa casa ou use uma habilidade
                    </p>
                  )}
                </>
              ) : (
                /* "Vez de [Nome]…" quando é vez do adversário
                   Na Morte Súbita: "VEZ DE [NOME]…" em vermelho */
                <p
                  className={`truncate font-display text-xl leading-tight font-extrabold uppercase short:text-lg ${suddenDeath ? 'text-danger' : ''}`}
                  style={suddenDeath ? undefined : { color: turnColor }}
                  title={player(opp)?.nickname}
                >
                  {`Vez de ${player(opp)?.nickname ?? 'Oponente'}…`}
                </p>
              )}
            </div>
          )}
          {phase === 'ROUND_DRAW' && (
            <p role="status" className="font-display text-lg leading-tight font-bold uppercase">
              Sorteio da 3ª habilidade
            </p>
          )}

          <DeckHud
            deck={deck}
            canUse={myTurn && !reconnecting}
            silenced={player(me)?.silenced ?? false}
            aim={aim}
          />
        </aside>

        {/* ── Camada de overlays ──
            Usa position:absolute inset-0 sem grid, para que os banners
            com inset-x-0 cubram 100% da largura da Arena. */}
        <div className="pointer-events-none absolute inset-0">
          {/* VS: cobre tudo */}
          <VsBanner />

          {/* Início de round / MATCH POINT: só nos primeiros segundos do round */}
          <RoundStartBanner />

          {/* Fim de round — centralizado verticalmente, largura total */}
          <Banner
            className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
            show={phase === 'ROUND_END' && roundEnd !== null && !absoluteDraw}
            title={
              roundEnd?.winner === me
                ? 'Round seu!'
                : roundEnd?.winner === opp
                  ? 'Round do oponente'
                  : 'Round empatado'
            }
            subtitle={`Placar ${score[me]} × ${score[opp]}`}
            color={roundEnd?.winner ? colorOf(characters[roundEnd.winner]) : undefined}
          />

          {/* W.O. — largura total */}
          <Banner
            className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
            show={outcome?.kind === 'WO'}
            title={outcome?.kind === 'WO' && outcome.winner === me ? 'Vitória por W.O.' : 'W.O.!'}
            subtitle={
              outcome?.kind === 'WO' && outcome.winner === me
                ? 'O oponente esgotou o tempo 3 vezes'
                : '3 tempos esgotados seguidos · Derrota'
            }
            tone="danger"
            color={
              outcome?.kind === 'WO' && outcome.winner === me ? colorOf(characters[me]) : undefined
            }
          />

          {/* Empate absoluto: um banner só, do fim do round 3 até o Resultado. Quando o MATCH_END
              chega (a sala segura a Arena por 2s), só o subtítulo troca para os Coins do servidor */}
          <Banner
            className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
            show={absoluteDraw || outcome?.kind === 'ABSOLUTE_DRAW'}
            title="Empate absoluto"
            subtitle={
              coins
                ? `+${coins[me]} Coins para cada`
                : roundEnd?.winner
                  ? `Placar final ${score[me]} × ${score[opp]}`
                  : 'Ninguém venceu a Morte Súbita'
            }
            tone="coin"
          />

          {/* Toast de turno perdido (TURN_TIMEOUT) */}
          <TurnTimeoutToast />

          {/* Morte Súbita: entrada (flash, fitas, banner), bordas pulsando, vibração e sons (FE-13) */}
          <SuddenDeathLayer />
        </div>

        {/* O sorteio vem antes da apresentação do round (banner ou entrada da Morte Súbita), que só
            aparece em PLAYING. z-[4]: a pausa abre por cima */}
        {phase === 'ROUND_DRAW' && (
          <DrawPicker
            options={drawOptions?.options ?? null}
            deadline={drawOptions?.deadline ?? null}
            chosen={deck.find((slot) => slot.source === 'DRAWN')?.ability ?? null}
          />
        )}

        {/* Overlay de pausa (pointer-events-auto: intercepta cliques) */}
        <PauseOverlay
          open={pauseOpen}
          onClose={() => setPauseOpen(false)}
          onHowToPlay={() => openModal('howToPlay')}
          onQuit={() => openModal('quit')}
        />
      </div>

      {/* Modais (fora do grid, montados no portal do dialog nativo) */}
      <HowToPlayModal
        open={activeModal === 'howToPlay'}
        onClose={closeModalToPause}
        closeLabel="Voltar ao menu"
      />
      <QuitModal open={activeModal === 'quit'} onContinue={closeModalToPause} onQuit={quit} />
    </>
  )
}

/**
 * Timer gigante da Morte Súbita com animação de "tick".
 * Usa useServerTimer para ler os segundos do servidor.
 */
function SuddenDeathTimerValue() {
  const turn = useTimerStore((s) => s.turn)
  const timer = useServerTimer(turn)
  const reduceMotion = useReducedMotion()
  const seconds = timer?.remainingSeconds ?? 0

  return (
    <motion.span
      key={seconds}
      initial={reduceMotion ? false : { scale: 1.45 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      {seconds}
    </motion.span>
  )
}
