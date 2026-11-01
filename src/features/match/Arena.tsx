import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Banner, PauseIcon } from '../../components/ui'
import { CHARACTER_INFO } from '../../constants/characters'
import { ABILITY_IMPACT_SECONDS } from '../../constants/game'
import { ABILITY_TEXTS, ARENA_TEXTS as T, joinParts, RESULT_TEXTS } from '../../constants/texts'
import { useIsBefore } from '../../hooks/useIsBefore'
import { useVoice } from '../../hooks/useLanguageFilter'
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
import { AbilityNotice } from '../powers/AbilityNotice'
import { DrawPicker } from '../powers/DrawPicker'
import { DeckHud } from '../powers/DeckHud'
import { useAbilityAim } from '../powers/useAbilityAim'
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
  const voice = useVoice()
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
  const lastAbility = useBoardStore((s) => s.lastAbility)
  const deck = usePowersStore((s) => s.deck)
  const drawOptions = usePowersStore((s) => s.drawOptions)
  const turn = useTimerStore((s) => s.turn)
  const turnKey = turn?.startedAt ?? null

  const player = (slot: PlayerSlot) => players.find((p) => p.slot === slot)
  const characters = { P1: player('P1')?.character, P2: player('P2')?.character }
  const myTurn = phase === 'PLAYING' && turn?.player === me
  const turnColor = colorOf(turn ? characters[turn.player] : null)
  const empty = cells.filter((c) => c.owner === null).map((c) => c.index)
  const { aim, targets, selected, pending, withoutTarget, hint, selectTarget } = useAbilityAim({
    me,
    canAct: myTurn && !reconnecting,
    turnKey,
  })
  // O efeito na casa dura ABILITY_IMPACT_SECONDS a partir da chegada do ABILITY_RESOLVED
  const impactVisible = useIsBefore(
    lastAbility ? lastAbility.receivedAt + ABILITY_IMPACT_SECONDS * 1000 : null,
  )

  // Fim do round 3 com o placar igual (1×1 ou 0×0) é empate absoluto [RN-ARN-06] (regra de 18/10).
  // Só muda o banner: o resultado oficial chega no MATCH_END
  const absoluteDraw = suddenDeath && roundEnd !== null && score.P1 === score.P2

  // Botão de pausa visível durante fases ativas (não no VS nem no fim de round)
  const showPauseButton = phase === 'PLAYING' || phase === 'ROUND_DRAW'

  const roundLabel =
    phase === 'VERSUS'
      ? T.roundLabel.versus
      : phase === 'ROUND_END'
        ? T.roundLabel.roundEnd(round)
        : suddenDeath
          ? T.roundLabel.suddenDeath(round)
          : T.roundLabel.normal(round)

  // Banner do fim do round: a fala do narrador (some com o filtro) antes do placar
  const roundEndLine =
    roundEnd?.winner === me
      ? voice(T.roundEnd.mineLine)
      : roundEnd?.winner === opp
        ? voice(T.roundEnd.opponentsLine)
        : null
  const woWon = outcome?.kind === 'WO' && outcome.winner === me

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
                <PauseIcon className="size-4" />
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
            aim={aim ? { targets, selected } : null}
            impact={impactVisible ? lastAbility : null}
            // Com a mira aberta, só os alvos da etapa atual (nenhum enquanto espera o servidor)
            selectable={!myTurn ? [] : aim ? targets : empty}
            disabled={reconnecting}
            onCellSelect={(cell) =>
              aim ? selectTarget(cell) : sendCommand({ type: 'MOVE', payload: { cell } })
            }
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
                      Na Morte Súbita: só "SUA VEZ" em vermelho, sem subtítulo (menos a mira) */}
                  <p
                    className={`font-display text-xl leading-tight font-extrabold uppercase short:text-lg ${suddenDeath ? 'text-danger' : ''}`}
                    style={suddenDeath ? undefined : { color: turnColor }}
                  >
                    {T.turn.yours}
                  </p>
                  {(hint || !suddenDeath) && (
                    <p className="mt-0.5 font-body text-xs text-text-muted">
                      {hint ?? T.turn.hint}
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
                  {T.turn.opponents(player(opp)?.nickname ?? T.opponent)}
                </p>
              )}
            </div>
          )}
          {phase === 'ROUND_DRAW' && (
            <p role="status" className="font-display text-lg leading-tight font-bold uppercase">
              {ABILITY_TEXTS.draw.title}
            </p>
          )}

          {/* Habilidade do oponente, anulada ou sem efeito: aqui, para não cobrir o tabuleiro */}
          <AbilityNotice />

          <DeckHud
            deck={deck}
            canUse={myTurn && !reconnecting}
            silenced={player(me)?.silenced ?? false}
            aim={aim}
            aimPending={pending}
            withoutTarget={withoutTarget}
            turnKey={turnKey}
            color={colorOf(characters[me])}
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
                ? T.roundEnd.mine
                : roundEnd?.winner === opp
                  ? T.roundEnd.opponents
                  : T.roundEnd.draw
            }
            subtitle={joinParts(roundEndLine, T.roundEnd.score(score[me], score[opp]))}
            color={roundEnd?.winner ? colorOf(characters[roundEnd.winner]) : undefined}
          />

          {/* W.O. — largura total, com o mesmo título e a mesma fala do Resultado */}
          <Banner
            className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
            show={outcome?.kind === 'WO'}
            title={woWon ? RESULT_TEXTS.titles.WO_WIN : RESULT_TEXTS.titles.WO_LOSS}
            subtitle={voice(woWon ? RESULT_TEXTS.lines.WO_WIN : RESULT_TEXTS.lines.WO_LOSS)}
            tone="danger"
            color={woWon ? colorOf(characters[me]) : undefined}
          />

          {/* Empate absoluto: um banner só, do fim do round 3 até o Resultado. Quando o MATCH_END
              chega (a sala segura a Arena por 2s), só o subtítulo troca para os Coins do servidor */}
          <Banner
            className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
            show={absoluteDraw || outcome?.kind === 'ABSOLUTE_DRAW'}
            title={T.absoluteDraw.title}
            subtitle={
              coins
                ? T.absoluteDraw.coinsEach(coins[me])
                : roundEnd?.winner
                  ? T.absoluteDraw.finalScore(score[me], score[opp])
                  : T.absoluteDraw.nobody
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
