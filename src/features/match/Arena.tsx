import { useState } from 'react'
import { Banner } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import { otherSlot } from '../../lib/match'
import { sendCommand } from '../../sockets/gameClient'
import { useBoardStore } from '../../stores/boardStore'
import { useMatchStore } from '../../stores/matchStore'
import { usePowersStore } from '../../stores/powersStore'
import { useRoomStore } from '../../stores/roomStore'
import { useTimerStore } from '../../stores/timerStore'
import type { CharacterId, PlayerSlot } from '../../types/game'
import { Board } from '../board'
import { VitaoSlot } from '../vitao/VitaoSlot'
import { HowToPlayModal } from './HowToPlayModal'
import { OpponentDisconnectedToast } from './OpponentDisconnectedToast'
import { PauseOverlay } from './PauseOverlay'
import { PlayerStrip } from './PlayerStrip'
import { QuitModal } from './QuitModal'
import { RoundStartBanner } from './RoundStartBanner'
import { SettingsModal } from './SettingsModal'
import { TurnTimeoutToast } from './TurnTimeoutToast'
import { VsBanner } from './VsBanner'

type ModalKind = 'howToPlay' | 'settings' | 'quit' | null

const colorOf = (character: CharacterId | null | undefined) =>
  character ? CHARACTER_INFO[character].color : undefined

/**
 * Arena (FE-28 + FE-05), em paisagem: jogadores à esquerda, tabuleiro no centro com a
 * altura toda, aviso do turno e deck à direita. Só lê as stores e manda intenções.
 * Precisa de um pai com altura definida (a tela inteira na sala).
 */
export function Arena() {
  const [pauseOpen, setPauseOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalKind>(null)

  const phase = useRoomStore((s) => s.phase)
  const players = useRoomStore((s) => s.players)
  const me: PlayerSlot = useRoomStore((s) => s.mySlot) ?? 'P1'
  const opp = otherSlot(me)
  const round = useMatchStore((s) => s.round)
  const score = useMatchStore((s) => s.score)
  const suddenDeath = useMatchStore((s) => s.suddenDeath)
  const timeouts = useMatchStore((s) => s.consecutiveTimeouts)
  const roundEnd = useMatchStore((s) => s.roundEnd)
  const outcome = useMatchStore((s) => s.outcome)
  const cells = useBoardStore((s) => s.cells)
  const winningLine = useBoardStore((s) => s.winningLine)
  const deck = usePowersStore((s) => s.deck)
  const turn = useTimerStore((s) => s.turn)

  const player = (slot: PlayerSlot) => players.find((p) => p.slot === slot)
  const characters = { P1: player('P1')?.character, P2: player('P2')?.character }
  const myTurn = phase === 'PLAYING' && turn?.player === me
  const turnColor = colorOf(turn ? characters[turn.player] : null)
  const empty = cells.filter((c) => c.owner === null).map((c) => c.index)

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

  // Ao fechar qualquer modal placeholder, volta a abrir a pausa
  const closeModalToPause = () => {
    setActiveModal(null)
    setPauseOpen(true)
  }

  return (
    <>
      <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 short:gap-2">
        {/* ── Coluna esquerda: pausa, rótulo do round, faixas, Vitão ── */}
        <aside
          aria-label="Jogadores"
          className="flex min-h-0 min-w-0 flex-col gap-2 pl-3 short:pl-2"
        >
          <div className="flex items-center gap-2">
            {/* Botão de pausa — só nas fases ativas */}
            {showPauseButton && (
              <button
                type="button"
                aria-label="Pausa"
                onClick={() => setPauseOpen(true)}
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-line font-mono text-sm text-text-muted transition hover:border-line hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
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
          <VitaoSlot />
          <PlayerStrip
            player={player(me)}
            isMe
            active={myTurn}
            roundsWon={score[me]}
            timeouts={timeouts[me]}
          />
        </aside>

        {/* ── Centro: tabuleiro ── */}
        <div className="aspect-square h-full max-w-[55vw] min-h-0">
          <Board
            cells={cells}
            characters={characters}
            winningLine={winningLine}
            selectable={myTurn ? empty : []}
            onCellSelect={(cell) => sendCommand({ type: 'MOVE', payload: { cell } })}
          />
        </div>

        {/* ── Coluna direita: subtexto de vez + deck (timer ficou dentro de cada faixa) ── */}
        <aside
          aria-label="Turno e habilidades"
          className="flex min-h-0 min-w-0 flex-col gap-2 pr-3 short:pr-2"
        >
          {phase === 'PLAYING' && turn && (
            <div role="status">
              {myTurn ? (
                <>
                  {/* "SUA VEZ" em display + subtítulo instrucional */}
                  <p
                    className="font-display text-xl leading-tight font-extrabold uppercase short:text-lg"
                    style={{ color: turnColor }}
                  >
                    Sua vez
                  </p>
                  <p className="mt-0.5 font-body text-xs text-text-muted">
                    Toque numa casa ou use uma habilidade
                  </p>
                </>
              ) : (
                /* "Vez de [Nome]…" quando é vez do adversário */
                <p
                  className="font-display text-base leading-tight font-bold uppercase short:text-sm"
                  style={{ color: turnColor }}
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

          {/* Deck só para exibição: o deck clicável é a FE-11 e a mira, a FE-27 */}
          <ul aria-label="Seu deck" className="mt-auto flex flex-col gap-1.5">
            {deck.map((slot) => (
              <li
                key={slot.ability}
                className={`rounded-lg border border-line px-2 py-1.5 text-sm ${slot.usedThisRound ? 'opacity-40' : ''}`}
              >
                {ABILITY_INFO[slot.ability].name}
                {slot.usedThisRound && <span className="text-xs text-text-muted"> · usada</span>}
              </li>
            ))}
          </ul>
        </aside>

        {/* ── Camada de overlays ──
            Usa position:absolute inset-0 sem grid, para que os banners
            com inset-x-0 cubram 100% da largura da Arena. */}
        <div className="pointer-events-none absolute inset-0">
          {/* VS: cobre tudo */}
          <VsBanner />

          {/* Início de round / MATCH POINT — inset-x-0 garante largura total */}
          <RoundStartBanner />

          {/* Fim de round — centralizado verticalmente, largura total */}
          <Banner
            className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
            show={phase === 'ROUND_END' && roundEnd !== null}
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

          {/* Toast de turno perdido (TURN_TIMEOUT) */}
          <TurnTimeoutToast />

          {/* Toast de oponente desconectado */}
          <OpponentDisconnectedToast />
        </div>

        {/* Overlay de pausa (pointer-events-auto: intercepta cliques) */}
        <PauseOverlay
          open={pauseOpen}
          onClose={() => setPauseOpen(false)}
          onHowToPlay={() => openModal('howToPlay')}
          onSettings={() => openModal('settings')}
          onQuit={() => openModal('quit')}
        />
      </div>

      {/* Modais (fora do grid, montados no portal do dialog nativo) */}
      <HowToPlayModal open={activeModal === 'howToPlay'} onClose={closeModalToPause} />
      <SettingsModal open={activeModal === 'settings'} onClose={closeModalToPause} />
      <QuitModal
        open={activeModal === 'quit'}
        onContinue={() => {
          setActiveModal(null)
          setPauseOpen(true)
        }}
        onQuit={() => setActiveModal(null)}
      />
    </>
  )
}
