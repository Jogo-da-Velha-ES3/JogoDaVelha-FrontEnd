import { motion } from 'framer-motion'
import { useShouldRotateDevice } from '../../hooks/useShouldRotateDevice'
import { Modal } from '../ui/Modal'

/**
 * Aviso "Gire o celular". O iPhone não deixa travar a orientação,
 * então o jogo bloqueia a tela em pé até o aparelho ser deitado. [RNF-ARQ-03]
 */
export function RotateDeviceModal() {
  const shouldRotate = useShouldRotateDevice()

  return (
    <Modal open={shouldRotate} dismissible={false} size="sm" title="Gire o celular">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <motion.svg
          viewBox="0 0 64 64"
          className="size-20 text-char-o drop-shadow-[0_0_10px_currentColor]"
          aria-hidden="true"
          animate={{ rotate: [0, 0, -90, -90, 0] }}
          transition={{ duration: 2.4, times: [0, 0.2, 0.45, 0.8, 1], repeat: Infinity }}
        >
          <rect
            x="20"
            y="6"
            width="24"
            height="52"
            rx="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <line x1="29" y1="51" x2="35" y2="51" stroke="currentColor" strokeWidth="3" />
        </motion.svg>
        <p>O Jogo do Velho é jogado com o celular deitado.</p>
      </div>
    </Modal>
  )
}
