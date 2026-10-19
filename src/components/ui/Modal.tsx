import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'

export interface ModalProps {
  open: boolean
  /** Chamado no Esc, no clique fora e no botão fechar; obrigatório se `dismissible` */
  onClose?: () => void
  title: ReactNode
  children?: ReactNode
  /** Botões do rodapé */
  actions?: ReactNode
  /** false = só sai por uma ação do conteúdo (ex: "Gire o celular") */
  dismissible?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Classes extras do corpo (ex: subir o corpo para o conteúdo passar sob o cabeçalho sem ser cortado) */
  bodyClassName?: string
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/**
 * Modal sobre o <dialog> nativo: foco preso, Esc e conteúdo de fundo inerte vêm do navegador.
 * Montado só enquanto aberto, para o AnimatePresence animar a saída.
 */
export function Modal({ open, ...props }: ModalProps) {
  return <AnimatePresence>{open && <ModalDialog {...props} />}</AnimatePresence>
}

/**
 * Dentro de uma moldura que declara `data-modal-bounds` (a tela simulada do celular, na vitrine),
 * o modal ocupa só a moldura, como o menu de pausa, em vez da janela inteira. Continua sendo o
 * <dialog> nativo (foco, Esc e fundo inerte); só muda o retângulo, que acompanha rolagem e
 * redimensionamento. Sem a moldura, nada muda.
 */
function useContainedBounds(ref: RefObject<HTMLDialogElement | null>) {
  useLayoutEffect(() => {
    const dialog = ref.current
    const host = dialog?.closest<HTMLElement>('[data-modal-bounds]')
    if (!dialog || !host) return

    const place = () => {
      const rect = host.getBoundingClientRect()
      Object.assign(dialog.style, {
        inset: 'auto',
        top: `${rect.top + host.clientTop}px`,
        left: `${rect.left + host.clientLeft}px`,
        width: `${host.clientWidth}px`,
        height: `${host.clientHeight}px`,
        padding: '0.5rem',
        borderRadius: getComputedStyle(host).borderRadius,
      })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    // O jsdom dos testes não tem ResizeObserver; sem ele, a moldura só acompanha rolagem e janela
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    observer?.observe(host)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
      observer?.disconnect()
    }
  }, [ref])
}
function ModalDialog({
  onClose,
  title,
  children,
  actions,
  dismissible = true,
  size = 'md',
  bodyClassName = '',
}: Omit<ModalProps, 'open'>) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const canClose = dismissible && onClose !== undefined

  useContainedBounds(ref)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <motion.dialog
      ref={ref}
      aria-labelledby={titleId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      // O Esc é controlado pelo React: o modal só fecha quando `open` vira false
      onCancel={(e) => {
        e.preventDefault()
        if (canClose) onClose()
      }}
      // O navegador pode forçar o fechamento (Esc repetido); um modal obrigatório volta a abrir
      onClose={(e) => {
        if (canClose) onClose()
        else e.currentTarget.showModal()
      }}
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) onClose()
      }}
      className={[
        'fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 p-4 px-safe short:py-3',
        'bg-bg-deep/80 text-text backdrop-blur-sm backdrop:bg-transparent',
        'open:flex items-center justify-center',
      ].join(' ')}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className={[
          'flex max-h-full w-full flex-col rounded-2xl border border-line bg-bg-panel',
          'shadow-glow-lg shadow-char-x/15',
          SIZE_CLASSES[size],
        ].join(' ')}
      >
        <header className="relative z-10 flex items-center justify-between gap-4 px-5 pt-4 short:px-4 short:pt-3">
          <h2
            id={titleId}
            className="font-display text-2xl leading-tight font-bold tracking-wide uppercase short:text-xl"
          >
            {title}
          </h2>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-2 grid size-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              {/* SVG em vez do caractere "×": o glifo fica fora do centro, varia por fonte */}
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </header>
        {children && (
          <div
            className={`min-h-0 overflow-y-auto px-5 py-3 text-text-muted short:px-4 short:py-2 ${bodyClassName}`}
          >
            {children}
          </div>
        )}
        {actions && (
          <footer className="flex flex-wrap justify-end gap-3 px-5 pt-1 pb-4 short:px-4 short:pb-3">
            {actions}
          </footer>
        )}
      </motion.div>
    </motion.dialog>
  )
}
