import React from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { VITAO_ENABLED } from '../../constants/game'

import vitaoBravo from './assets/vitao-bravo.webp'
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
  bravo: vitaoBravo,
  muitoBravo: vitaoMuitoBravo,
  diabo: vitaoDiabo,
}

const idleVariants = {
  animate: (shouldReduce: boolean) => ({
    y: shouldReduce ? 0 : [0, -5, 0],
    rotate: shouldReduce ? 0 : [-2, 2, -2],
    scale: shouldReduce ? 1 : [1, 1.02, 1],
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
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center select-none"
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
                className="absolute -top-12 z-20 max-w-[130px] rounded-xl border border-cyan-500/60 bg-slate-900/95 px-3 py-1.5 text-center font-semibold text-cyan-200 text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)] backdrop-blur-md md:max-w-[150px]"
              >
                {fala}
                <div className="absolute -bottom-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-r-6 border-t-6 border-l-6 border-r-transparent border-t-slate-900/95 border-l-transparent" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex h-full w-full items-center justify-center">
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
                className="h-24 w-24 object-contain drop-shadow-[0_0_10px_rgba(0,240,255,0.35)] md:h-32 md:w-32"
              />
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}
