import { Banner, TimerBar } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import { DRAW_PICK_SECONDS } from '../../constants/game'
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
import { PlayerStrip } from './PlayerStrip'

const colorOf = (character: CharacterId | null | undefined) =>
  character ? CHARACTER_INFO[character].color : undefined

/**
 * Esqueleto da Arena (FE-28), em paisagem: jogadores à esquerda, tabuleiro no centro com a
 * altura toda, aviso do turno, timer e deck à direita. Só lê as stores e manda intenções.
 * Precisa de um pai com altura definida (a tela inteira na sala).
 */
export function Arena() {
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
  const cells = useBoardStore((s) => s.cells)
  const winningLine = useBoardStore((s) => s.winningLine)
  const deck = usePowersStore((s) => s.deck)
  const drawOptions = usePowersStore((s) => s.drawOptions)
  const turn = useTimerStore((s) => s.turn)

  const player = (slot: PlayerSlot) => players.find((p) => p.slot === slot)
  const characters = { P1: player('P1')?.character, P2: player('P2')?.character }
  const myTurn = phase === 'PLAYING' && turn?.player === me
  const turnColor = colorOf(turn ? characters[turn.player] : null)
  const empty = cells.filter((c) => c.owner === null).map((c) => c.index)

  const roundLabel =
    phase === 'VERSUS'
      ? 'Confronto'
      : phase === 'ROUND_END'
        ? `Fim do round ${round}`
        : suddenDeath
          ? `Round ${round} · Morte Súbita`
          : `Round ${round} · MD3`

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 short:gap-2">
      <aside aria-label="Jogadores" className="flex min-h-0 min-w-0 flex-col gap-2">
        {/* Pausa (FE-05) entra antes do rótulo */}
        <p
          className={`font-display text-sm font-bold tracking-wide uppercase ${suddenDeath ? 'text-danger' : 'text-text-muted'}`}
        >
          {roundLabel}
        </p>
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

      <div className="aspect-square h-full max-w-[55vw] min-h-0">
        <Board
          cells={cells}
          characters={characters}
          winningLine={winningLine}
          selectable={myTurn ? empty : []}
          disabled={reconnecting}
          onCellSelect={(cell) => sendCommand({ type: 'MOVE', payload: { cell } })}
        />
      </div>

      <aside aria-label="Turno e habilidades" className="flex min-h-0 min-w-0 flex-col gap-2">
        {phase === 'PLAYING' && turn && (
          <p
            role="status"
            className="font-display text-xl leading-tight font-extrabold uppercase short:text-lg"
            style={{ color: turnColor }}
          >
            {myTurn ? 'Sua vez' : 'Vez do oponente'}
          </p>
        )}
        {phase === 'ROUND_DRAW' && (
          <p role="status" className="font-display text-lg leading-tight font-bold uppercase">
            Sorteio da 3ª habilidade
          </p>
        )}

        {/* Timer sempre do turno atual; vermelho só na sua vez (decisão de 16/10) */}
        <TimerBar
          deadline={
            phase === 'ROUND_DRAW' && drawOptions
              ? {
                  startedAt: drawOptions.deadline - DRAW_PICK_SECONDS * 1000,
                  durationSeconds: DRAW_PICK_SECONDS,
                }
              : turn
          }
          color={phase === 'ROUND_DRAW' ? undefined : turnColor}
          warnAtSeconds={turn && !myTurn ? 0 : 3}
          label={myTurn ? 'Seu tempo' : 'Tempo do turno'}
        />

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

      {/* Camada de avisos: os banners da FE-05 entram aqui */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <Banner
          className="w-full"
          show={phase === 'VERSUS'}
          title="Confronto"
          subtitle={`${player(me)?.nickname ?? 'Você'} vs ${player(opp)?.nickname ?? 'Oponente'}`}
        />
        <Banner
          className="w-full"
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
        {/* W.O.: vermelho só para quem perdeu (PROJECT_CONTEXT §9) */}
        <Banner
          className="w-full"
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
      </div>
    </div>
  )
}
