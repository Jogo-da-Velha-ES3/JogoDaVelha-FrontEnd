import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button, Modal } from '../../components/ui'
import {
  BOARD_CELLS,
  BOARD_SIZE,
  MAX_CONSECUTIVE_TIMEOUTS,
  ROUNDS_TO_WIN_MATCH,
  WIN_LENGTH,
} from '../../constants/game'
import type { Cell, PlayerSlot, PlayerState } from '../../types/game'
import { Board } from '../board'
import { PlayerStrip } from '../match/PlayerStrip'
import { CoinsReward } from '../results/CoinsReward'
import { HowToPlayDeck } from './HowToPlayDeck'
import {
  HOW_TO_PLAY_PAGES,
  HOW_TO_PLAY_TEXTS as TEXTS,
  type HowToPlayCoinRow,
  type HowToPlayPage,
  type HowToPlayVisual,
} from './howToPlayTexts'

interface HowToPlayModalProps {
  open: boolean
  /** Fecha o modal (na Arena, volta ao menu de pausa) */
  onClose: () => void
  /** Rótulo do botão de saída, na última página */
  closeLabel?: string
}

// Tabuleiro de exemplo, igual ao do esboço: uma linha de X completa e algumas peças de O
const O_CELLS = [5, 7, 10]
const DEMO_CELLS: readonly Cell[] = Array.from({ length: BOARD_CELLS }, (_, index) => {
  const owner: PlayerSlot | null = index < BOARD_SIZE ? 'P1' : O_CELLS.includes(index) ? 'P2' : null
  return { index, owner, effects: [] }
})
const DEMO_LINE = Array.from({ length: WIN_LENGTH }, (_, index) => index)

// Faixas de exemplo (PlayerStrip da Arena), só com dados fixos: nada vem do servidor ou das stores
const demoPlayer = (slot: PlayerSlot, nickname: string, timeouts = 0): PlayerState => ({
  slot,
  userId: `demo-${slot}`,
  nickname,
  character: slot === 'P1' ? 'X' : 'O',
  roundsWon: 0,
  consecutiveTimeouts: timeouts,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
})
const DEMO_SCORE_PLAYERS = {
  P1: demoPlayer('P1', TEXTS.demoSelf),
  P2: demoPlayer('P2', TEXTS.demoOpponent),
}
// Um round vencido por cada lado: o placar que leva ao round 3
const TIED_ROUNDS = ROUNDS_TO_WIN_MATCH - 1
const DEMO_TIMEOUT_PLAYER = demoPlayer('P1', TEXTS.demoSelf, MAX_CONSECUTIVE_TIMEOUTS - 1)

const LAST_PAGE = HOW_TO_PLAY_PAGES.length - 1
const SLIDE_OFFSET_PX = 24

/**
 * Modal "Como Jogar": guia de regras em páginas. Navega por Anterior/Próximo, pelas bolinhas e
 * por ← →; o Esc, o X e o clique fora fecham (comportamento do `Modal`). Reabrir volta à 1ª página.
 */
export function HowToPlayModal({ open, onClose, closeLabel = TEXTS.close }: HowToPlayModalProps) {
  const reduceMotion = useReducedMotion()
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [wasOpen, setWasOpen] = useState(open)

  // Ao abrir de novo, recomeça da primeira página (durante a saída, a página atual continua)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPage(0)
      setDirection(1)
    }
  }

  useEffect(() => {
    if (!open) return
    const step = (delta: 1 | -1) => {
      setDirection(delta)
      setPage((current) => Math.min(LAST_PAGE, Math.max(0, current + delta)))
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowRight') step(1)
      else if (event.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const goTo = (target: number) => {
    setDirection(target > page ? 1 : -1)
    setPage(target)
  }

  const current = HOW_TO_PLAY_PAGES[page]
  const isLast = page === LAST_PAGE
  const offset = reduceMotion ? 0 : SLIDE_OFFSET_PX
  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * offset }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: -dir * offset }),
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={TEXTS.title}
      dismissible
      size="lg"
      actions={
        <div className="flex w-full items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => goTo(page - 1)}
            className="min-w-24"
          >
            {TEXTS.previous}
          </Button>

          <nav aria-label={TEXTS.pagesNav} className="flex flex-1 items-center justify-center">
            {HOW_TO_PLAY_PAGES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={TEXTS.pageLabel(index + 1, HOW_TO_PLAY_PAGES.length, item.title)}
                aria-current={index === page ? 'step' : undefined}
                onClick={() => goTo(index)}
                className="grid size-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span
                  className={[
                    'size-2.5 rounded-full transition-colors',
                    index === page
                      ? 'bg-primary shadow-glow shadow-primary/50'
                      : 'bg-text-muted/40',
                  ].join(' ')}
                />
              </button>
            ))}
          </nav>

          <Button
            variant={isLast ? 'primary' : 'secondary'}
            size="sm"
            onClick={isLast ? onClose : () => goTo(page + 1)}
            className="min-w-24"
          >
            {isLast ? closeLabel : TEXTS.next}
          </Button>
        </div>
      }
    >
      {/* Esboço: visual à esquerda, texto à direita; larguras fixas evitam rolagem no celular deitado */}
      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section
            key={current.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            // Altura mínima = a do tabuleiro: o modal não muda de tamanho entre as páginas
            className="flex min-h-52 items-center gap-5 short:min-h-44 short:gap-3"
          >
            {current.visual === 'deck' ? (
              <HowToPlayDeck
                heading={<PageHeading page={current} index={page} />}
                points={current.points}
              />
            ) : (
              <>
                {current.visual !== 'coins' && <SideVisual kind={current.visual} />}
                <div className="min-w-0 flex-1">
                  <PageContent page={current} index={page} />
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </Modal>
  )
}

/** Visuais da base usados de forma estática: sem stores, sem lógica de jogo e sem timer */
function SideVisual({ kind }: { kind: Exclude<HowToPlayVisual, 'coins' | 'deck'> }) {
  if (kind === 'board') {
    return (
      <div aria-hidden="true" className="size-52 shrink-0 short:size-44">
        <Board cells={DEMO_CELLS} characters={{ P1: 'X', P2: 'O' }} winningLine={DEMO_LINE} />
      </div>
    )
  }

  return (
    <div aria-hidden="true" className="flex w-52 shrink-0 flex-col gap-2 short:w-44">
      <PlayerStrip
        player={kind === 'timeouts' ? DEMO_TIMEOUT_PLAYER : DEMO_SCORE_PLAYERS.P1}
        isMe={false}
        active={false}
        roundsWon={kind === 'score' ? TIED_ROUNDS : 0}
        timeouts={kind === 'timeouts' ? MAX_CONSECUTIVE_TIMEOUTS - 1 : 0}
      />
      {kind === 'score' && (
        <PlayerStrip
          player={DEMO_SCORE_PLAYERS.P2}
          isMe={false}
          active={false}
          roundsWon={TIED_ROUNDS}
          timeouts={0}
        />
      )}
    </div>
  )
}

function PageHeading({ page, index }: { page: HowToPlayPage; index: number }) {
  return (
    <>
      <p className="font-mono text-xs tracking-widest text-text-muted uppercase">
        {TEXTS.pageOf(index + 1, HOW_TO_PLAY_PAGES.length)}
      </p>
      <h3 className="font-display text-xl leading-tight font-bold tracking-wide text-text uppercase short:text-lg">
        {page.title}
      </h3>
    </>
  )
}

function PageContent({ page, index }: { page: HowToPlayPage; index: number }) {
  return (
    <>
      <PageHeading page={page} index={index} />
      {page.points.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm leading-snug">
          {page.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
      {page.coinRows && <CoinsTable rows={page.coinRows} />}
    </>
  )
}

/** Tabela de Coins com a moeda do Resultado (CoinsReward), parada e sem contagem */
function CoinsTable({ rows }: { rows: readonly HowToPlayCoinRow[] }) {
  // `--u` é o tamanho-base que o CoinsReward espera do Resultado: aqui fixa o texto em 1rem
  return (
    <ul className="mt-2 grid grid-flow-col grid-rows-3 gap-x-6 gap-y-1 [--u:20rem]">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 [&>p]:justify-start">
            <CoinsReward amount={row.amount} countUp={false} />
          </span>
          <span>{row.label}</span>
        </li>
      ))}
    </ul>
  )
}
