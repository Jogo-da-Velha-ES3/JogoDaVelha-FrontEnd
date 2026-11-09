import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'
import { Toaster } from '../ui/Toast'
import { RotateDeviceModal } from './RotateDeviceModal'
import { ServerWakeNotice } from './ServerWakeNotice'

/**
 * Moldura de toda tela: ocupa a altura visível, respeita o notch nas laterais
 * (env(safe-area-inset-left/right)) e não deixa overflow horizontal.
 * Também monta os toasts, o aviso "Gire o celular" e o "Acordando o servidor…" (FE-51).
 */
export function LandscapeShell({ children }: { children: ReactNode }) {
  return (
    // "user": o Framer Motion corta animações de movimento com prefers-reduced-motion
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip px-safe">
        {children}
      </div>
      <Toaster />
      <RotateDeviceModal />
      <ServerWakeNotice />
    </MotionConfig>
  )
}
