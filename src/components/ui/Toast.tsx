import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useToastStore, type Toast, type ToastTone } from '../../stores/toastStore'

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-primary/40 shadow-primary/20',
  danger: 'border-danger text-danger shadow-danger/40',
  coin: 'border-coin text-coin shadow-coin/40',
}

/**
 * Pilha de toasts. Montar uma vez no topo da aplicação e disparar com `showToast`.
 * Fica no alto da tela porque, no celular deitado, o teclado cobre a metade de baixo.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-safe pt-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useToastStore((s) => s.dismissToast)

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, dismissToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      onClick={() => dismissToast(toast.id)}
      className={[
        'pointer-events-auto max-w-md cursor-pointer rounded-xl border bg-bg-panel/95 px-4 py-2',
        'text-sm font-medium shadow-glow backdrop-blur',
        TONE_CLASSES[toast.tone],
      ].join(' ')}
    >
      {toast.message}
    </motion.div>
  )
}
