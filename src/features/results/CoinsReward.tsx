import { animate, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { COINS_COUNT_SECONDS } from '../../constants/game'

export interface CoinsRewardProps {
  /** Coins desta partida como o servidor mandou; undefined = ainda não vieram (ex: snapshot sem Coins) */
  amount: number | undefined
  /** Conta de 0 até o valor (resultado ao vivo). Falso: mostra o valor final, parado */
  countUp: boolean
}

/** Moeda dourada: anel com brilho (o `.coin-big` do esboço) e o miolo cheio (o `.coin::before`) */
function CoinIcon({ spin }: { spin: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className="grid size-[1.1em] shrink-0 place-items-center rounded-full border-2 border-coin shadow-[0_0_8px_var(--color-coin)]"
      style={{ transformPerspective: 200 }}
      animate={spin ? { rotateY: 360 } : undefined}
      transition={{ duration: COINS_COUNT_SECONDS, ease: 'easeOut' }}
    >
      <span className="size-[40%] rounded-full bg-coin" />
    </motion.span>
  )
}

/**
 * Coins da partida no Resultado (FE-15) [RF-POS-02]. Só mostra o número que o servidor mandou:
 * nada é somado a saldo nenhum, e o valor nunca é calculado aqui.
 *
 * - `countUp`: a contagem de 0 até o valor roda uma vez, quando a tela monta. Sem "reduzir
 *   movimento", senão o valor final aparece direto.
 * - Se o valor mudar depois (caso improvável: outro valor para a mesma partida), a contagem para e
 *   o valor mais recente aparece parado; nada recomeça.
 * - 0 aparece parado e atenuado ("0 Coins"), sem "+". Sem valor, "Coins já creditados".
 * - O número que sobe é só visual (aria-hidden); o leitor de tela lê o valor final uma vez.
 */
export function CoinsReward({ amount, countUp }: CoinsRewardProps) {
  const reduceMotion = useReducedMotion()
  const [first] = useState(amount) // o valor com que a tela montou, e que a contagem vai contar
  const [finished, setFinished] = useState(false)
  const numberRef = useRef<HTMLSpanElement>(null)

  const changed = amount !== first
  const running =
    countUp && !reduceMotion && !finished && !changed && first !== undefined && first > 0

  // Antes da primeira pintura, o contador já começa em 0
  useLayoutEffect(() => {
    if (running && numberRef.current) numberRef.current.textContent = '0'
  }, [running])

  useEffect(() => {
    if (!running || first === undefined) return
    const controls = animate(0, first, {
      duration: COINS_COUNT_SECONDS,
      ease: 'easeOut',
      // Escreve direto no elemento: 1,2s de contagem sem renderizar o React a cada quadro
      onUpdate: (value) => {
        if (numberRef.current) numberRef.current.textContent = String(Math.round(value))
      },
      onComplete: () => setFinished(true),
    })
    return () => controls.stop()
  }, [running, first])

  if (amount === undefined) {
    return <p className="font-mono text-coin/70">Coins já creditados</p>
  }

  const zero = amount === 0
  return (
    <p
      className={`flex flex-wrap items-baseline justify-center gap-x-2 text-[clamp(1rem,calc(var(--u)*0.05),1.75rem)] ${zero ? 'opacity-60' : ''}`}
    >
      <span className="sr-only">{zero ? '0 Coins' : `+${amount} Coins`}</span>
      <span aria-hidden="true" className="inline-flex items-center gap-1.5 font-mono text-coin">
        <CoinIcon spin={running} />
        <span className="inline-flex">
          {!zero && '+'}
          {/* O número final, invisível, reserva a largura: a contagem não empurra o layout */}
          <span className="inline-grid tabular-nums">
            <span className="invisible col-start-1 row-start-1">{amount}</span>
            {running ? (
              <span
                ref={numberRef}
                data-coins-value=""
                data-counting=""
                className="col-start-1 row-start-1 text-right"
              />
            ) : (
              <span data-coins-value="" className="col-start-1 row-start-1 text-right">
                {amount}
              </span>
            )}
          </span>
        </span>
        <span>Coins</span>
      </span>
    </p>
  )
}
