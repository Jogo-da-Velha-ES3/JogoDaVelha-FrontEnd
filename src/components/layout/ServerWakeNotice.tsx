import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { APP_TEXTS } from '../../constants/texts'
import { useServerWakeStore } from '../../stores/serverWakeStore'

const T = APP_TEXTS.serverWaking

/**
 * O atributo `popover` só vai quando dá para abrir o popover: um ambiente que esconde `[popover]`
 * sem ter a API (ex: o jsdom dos testes) deixaria o aviso invisível. Sem ela, vale a camada fixa.
 */
const SUPPORTS_POPOVER =
  typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype

/**
 * "Acordando o servidor…" (FE-51): no alto da tela enquanto alguma chamada ao servidor estiver
 * lenta, e some sozinho quando todas respondem. Fica na camada de cima do navegador (popover) para
 * aparecer também sobre os modais que esperam o servidor (Entrar com Código, Comprar Coins,
 * Esqueci minha senha). Não recebe toque: nunca atrapalha a tela de baixo.
 */
export function ServerWakeNotice() {
  const waking = useServerWakeStore((s) => s.slowCalls > 0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    // Sem a Popover API (navegador antigo, testes), o aviso fica como uma camada fixa comum
    if (!waking || !el || !SUPPORTS_POPOVER) return
    const raise = () => {
      if (el.matches(':popover-open')) el.hidePopover()
      el.showPopover()
    }
    raise()
    // Um modal aberto depois entra por cima do aviso: ele volta para o topo
    const observer = new MutationObserver(raise)
    observer.observe(document.body, { subtree: true, attributeFilter: ['open'] })
    return () => {
      observer.disconnect()
      if (el.isConnected && el.matches(':popover-open')) el.hidePopover()
    }
  }, [waking])

  if (!waking) return null

  return (
    <div
      ref={ref}
      popover={SUPPORTS_POPOVER ? 'manual' : undefined}
      className="pointer-events-none fixed inset-x-0 top-0 bottom-auto z-[60] m-0 flex h-auto w-full max-w-none justify-center overflow-visible border-0 bg-transparent px-safe pt-3 pb-0"
    >
      <motion.div
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex max-w-md items-center gap-3 rounded-xl border border-primary/40 bg-bg-panel/95 px-4 py-2 shadow-glow shadow-primary/20 backdrop-blur short:py-1.5"
      >
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
        />
        <span className="min-w-0 text-left">
          <span className="block font-display text-sm font-bold tracking-wide text-primary uppercase">
            {T.title}
          </span>
          <span className="block text-xs text-text-muted">{T.detail}</span>
        </span>
      </motion.div>
    </div>
  )
}
