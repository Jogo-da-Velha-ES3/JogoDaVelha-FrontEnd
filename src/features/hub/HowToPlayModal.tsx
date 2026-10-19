import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { BOARD_CELLS, BOARD_SIZE, WIN_LENGTH } from '../../constants/game'
import type { Cell, PlayerSlot } from '../../types/game'
import { Board } from '../board'
import {
  HOW_TO_PLAY_PAGES,
  HOW_TO_PLAY_TEXTS as TEXTS,
  type HowToPlayPage,
  type HowToPlaySlide,
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
      {/* Esboço: tabuleiro à esquerda, texto à direita; a altura fixa evita rolagem no celular deitado */}
      <div className="flex items-center gap-5 short:gap-3">
        <div aria-hidden="true" className="size-52 shrink-0 short:size-44">
          <Board cells={DEMO_CELLS} characters={{ P1: 'X', P2: 'O' }} winningLine={DEMO_LINE} />
        </div>

        <div className="min-w-0 flex-1" aria-live="polite">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.section
              key={current.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
            >
              <PageContent page={current} index={page} />
            </motion.section>
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  )
}

function PageContent({ page, index }: { page: HowToPlayPage; index: number }) {
  return (
    <>
      <p className="font-mono text-xs tracking-widest text-text-muted uppercase">
        {TEXTS.pageOf(index + 1, HOW_TO_PLAY_PAGES.length)}
      </p>
      <h3 className="font-display text-xl leading-tight font-bold tracking-wide text-text uppercase short:text-lg">
        {page.title}
      </h3>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {page.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {page.slides && <SlideCarousel slides={page.slides} />}
    </>
  )
}

/** Carrossel interno da página: tem botões próprios e não mexe na navegação principal */
function SlideCarousel({ slides }: { slides: readonly HowToPlaySlide[] }) {
  const [index, setIndex] = useState(0)
  const slide = slides[index]

  return (
    <div className="mt-2 rounded-xl border border-line p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-sm font-bold tracking-wide text-text uppercase">
          {slide.title}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={TEXTS.previousSlide}
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
          >
            ‹
          </button>
          <span className="font-mono text-xs text-text-muted">
            {TEXTS.slideOf(index + 1, slides.length)}
          </span>
          <button
            type="button"
            aria-label={TEXTS.nextSlide}
            disabled={index === slides.length - 1}
            onClick={() => setIndex(index + 1)}
            className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm">{slide.text}</p>
    </div>
  )
}
