import React from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { VITAO_ENABLED } from '../../constants/game'
import vitaoDebochado from './assets/vitao-debochado.webp'
import vitaoDiabo from './assets/vitao-diabo.webp'
import vitaoDormindo from './assets/vitao-dormindo.webp'
import vitaoMuitoBravo from './assets/vitao-muito-bravo.webp'
import vitaoNormal from './assets/vitao-normal.webp'
import vitaoRindo from './assets/vitao-rindo.webp'
import vitaoSurpreso from './assets/vitao-surpreso.webp'

export type VitaoReacao =
  'normal' | 'comemorar' | 'susto' | 'debochar' | 'dormir' | 'bravo' | 'muitoBravo' | 'diabo'

export interface VitaoProps {
  reacao?: VitaoReacao
  fala?: string
}

const EXPRESSION_ASSETS: Record<VitaoReacao, string> = {
  normal: vitaoNormal,
  comemorar: vitaoRindo,
  susto: vitaoSurpreso,
  debochar: vitaoDebochado,
  dormir: vitaoDormindo,
  bravo: vitaoMuitoBravo,
  muitoBravo: vitaoMuitoBravo,
  diabo: vitaoDiabo,
}

// ----------------------------------------------------------------------
// ⚡ NOVA ALTERAÇÃO: Variantes para o loop contínuo (Respiro + Balanço Idle)
// ----------------------------------------------------------------------
const idleVariants = {
  animate: (shouldReduce: boolean) => ({
    y: shouldReduce ? 0 : [0, -5, 0], // Flutuação vertical (respiro)
    rotate: shouldReduce ? 0 : [-2, 2, -2], // Micro-balanço lateral suave da cabeça
    scale: shouldReduce ? 1 : [1, 1.02, 1], // Leve expansão simulando respiração
    transition: {
      duration: 3.2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  }),
}

export function VitaoSlot({ reacao = 'normal', fala }: VitaoProps) {
  const shouldReduceMotion = useReducedMotion()

  const reactionVariants = {
    susto: {
      scale: shouldReduceMotion ? 1 : [1, 1.15, 1],
      rotate: shouldReduceMotion ? 0 : [0, -5, 5, 0],
    },
    comemorar: {
      y: shouldReduceMotion ? 0 : [0, -10, 0, -5, 0],
    },
    bravo: {
      x: shouldReduceMotion ? 0 : [0, -4, 4, -4, 4, 0],
    },
    muitoBravo: {
      x: shouldReduceMotion ? 0 : [0, -6, 6, -6, 6, 0],
      scale: shouldReduceMotion ? 1 : [1, 1.1, 1],
    },
    default: { scale: 1, y: 0, x: 0 },
  }

  return (
    <div
      data-region="vitao"
      aria-hidden={!VITAO_ENABLED}
      className="min-h-0 flex-1 relative flex flex-col items-center justify-center select-none"
    >
      {VITAO_ENABLED && (
        <>
          <AnimatePresence>
            {fala && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.85 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                className="absolute -top-12 z-20 max-w-[130px] md:max-w-[150px] px-3 py-1.5 bg-slate-900/95 border border-cyan-500/60 rounded-xl text-cyan-200 text-xs font-semibold text-center shadow-[0_0_12px_rgba(6,182,212,0.3)] backdrop-blur-md"
              >
                {fala}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-t-6 border-t-slate-900/95" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative w-full h-full flex items-center justify-center">
            {/* ---------------------------------------------------------------------- */}
            {/* ⚡ NOVA ALTERAÇÃO: Envoltório (motion.div) responsável pelo Idle contínuo */}
            {/* ---------------------------------------------------------------------- */}
            <motion.div
              variants={idleVariants}
              custom={shouldReduceMotion}
              animate="animate"
              className="flex items-center justify-center"
            >
              <motion.img
                key={reacao}
                src={EXPRESSION_ASSETS[reacao]}
                alt={`Vitão ${reacao}`}
                variants={reactionVariants}
                animate={
                  reactionVariants[reacao as keyof typeof reactionVariants] ? reacao : 'default'
                }
                transition={{ duration: 0.35 }}
                className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_10px_rgba(0,240,255,0.35)]"
              />
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}
