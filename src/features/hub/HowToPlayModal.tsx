import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { CoinsReward } from '../results/CoinsReward'
import { HowToPlayDeck } from './HowToPlayDeck'
import { HowToPlayRichText } from './HowToPlayRichText'
import { SideVisual } from './HowToPlayVisuals'
import {
  HOW_TO_PLAY_PAGES,
  HOW_TO_PLAY_TEXTS as TEXTS,
  type HowToPlayCoinRow,
  type HowToPlayPage,
} from './howToPlayTexts'
interface HowToPlayModalProps {
  open: boolean
  /** Fecha o modal (na Arena, volta ao menu de pausa) */
  onClose: () => void
  /** Rótulo do botão de saída, na última página */
  closeLabel?: string
}

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
  const footerRef = useRef<HTMLDivElement>(null)

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
      // Mesmos modificadores ignorados pelo carrossel: Shift+seta não muda de página em nenhum lugar
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return
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

  // O carrossel da página de habilidades pediu para sair pela ponta: muda de página e leva o
  // foco ao botão correspondente (o foco estava num botão do carrossel, que vai desmontar)
  const leaveCarousel = (delta: 1 | -1) => {
    footerRef.current
      ?.querySelector<HTMLButtonElement>(
        delta === 1 ? '[data-nav="next"]' : '[data-nav="previous"]',
      )
      ?.focus()
    goTo(page + delta)
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
      // O título da página sobe até a linha do indicador, acima da área do corpo; o corpo sobe 16px
      // (e ganha 16px de padding, então nada muda de lugar) para o título e o acento do "Ú" não
      // serem cortados pela rolagem do corpo
      bodyClassName="-mt-4 pt-7 short:pt-6"
      actions={
        <div ref={footerRef} className="flex w-full items-center gap-2">
          <Button
            data-nav="previous"
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
            data-nav="next"
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
      {/* A página desliza 24px na troca: sem cortar o excesso na horizontal, o corpo do modal
          (overflow-y-auto) ganha uma barra de rolagem lateral por alguns quadros. A folga de
          1 (-mx-1/px-1) deixa o contorno do foco dos botões aparecer inteiro. */}
      <div className="-mx-1 overflow-x-clip px-1">
        {/* Cabeçalho fixo logo abaixo do título do modal: não anima nem muda de lugar entre as
            páginas. A página de habilidades encaixa os controles do carrossel no espaço à direita. */}
        <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Indicador no topo da linha e 8px mais acima, perto do "COMO JOGAR" (só eixo Y) */}
          <p className="-translate-y-2 self-start font-mono text-xs tracking-widest text-text-muted uppercase">
            {TEXTS.pageOf(page + 1, HOW_TO_PLAY_PAGES.length)}
          </p>
          {/* -translate-y-5.5: sobe o título até a linha do indicador, perto do "COMO JOGAR" (só eixo Y) */}
          {/* Só o título é anunciado na troca de página; o conteúdo se lê navegando */}
          <h3
            aria-live="polite"
            className="-translate-y-5.5 text-center font-display text-3xl leading-none font-bold tracking-wide text-text uppercase short:text-2xl"
          >
            {current.title}
          </h3>
          <div />
        </div>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section
            key={current.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            // -mt-6 sobe o conteúdo para o espaço livre abaixo do título (que já foi para a linha do
            // indicador). A altura mínima é igual em todas as páginas: o modal não muda de tamanho
            className="-mt-6 flex min-h-52 items-center justify-center gap-5 short:min-h-41 short:gap-3"
          >
            {current.visual === 'deck' ? (
              <HowToPlayDeck points={current.points} onLeave={leaveCarousel} />
            ) : (
              <>
                {current.visual !== 'coins' && <SideVisual kind={current.visual} />}
                <div className="min-w-0">
                  <PageContent page={current} />
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </Modal>
  )
}

function PageContent({ page }: { page: HowToPlayPage }) {
  return (
    <>
      {page.points.length > 0 && (
        <ul
          className={[
            'flex flex-col font-medium text-text',
            page.largeText
              ? 'gap-2 text-base leading-snug short:gap-1.5 short:text-[15px]'
              : 'gap-1 text-sm leading-snug',
          ].join(' ')}
        >
          {page.points.map((point) => (
            <li key={point}>
              <HowToPlayRichText text={point} />
            </li>
          ))}
        </ul>
      )}
      {page.coinRows && <CoinsTable rows={page.coinRows} />}
    </>
  )
}

// Vitória na cor dos destaques das outras páginas; derrota em vermelho, como no Resultado.
const COIN_TONE_CLASS: Record<HowToPlayCoinRow['tone'], string> = {
  win: 'text-primary',
  loss: 'text-danger',
  draw: 'text-text',
}

/**
 * Tabela de Coins: cada resultado numa linha própria, com o nome à esquerda e a quantidade (a moeda
 * do Resultado, CoinsReward, parada e sem contagem) à direita, na mesma linha.
 */
function CoinsTable({ rows }: { rows: readonly HowToPlayCoinRow[] }) {
  // `--u` é o tamanho-base que o CoinsReward espera do Resultado: aqui fixa o texto em 1rem.
  // Grid de 2 colunas; se a quantidade de linhas for ímpar, a última fica sozinha no centro, com a
  // largura de uma coluna.
  const lonely = rows.length % 2 === 1 ? rows.length - 1 : -1
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 [--u:20rem]">
      {rows.map((row, position) => (
        <li
          key={row.label}
          className={[
            'flex items-center justify-between gap-3 rounded-lg border border-line bg-bg-panel px-3 py-1.5',
            position === lonely ? 'col-span-2 w-[calc(50%-0.5rem)] justify-self-center' : '',
          ].join(' ')}
        >
          <span
            className={`text-lg leading-tight font-medium short:text-base ${COIN_TONE_CLASS[row.tone]}`}
          >
            {row.label}
          </span>
          <span className="w-28 shrink-0 [&>p]:justify-start">
            <CoinsReward amount={row.amount} countUp={false} />
          </span>
        </li>
      ))}
    </ul>
  )
}
