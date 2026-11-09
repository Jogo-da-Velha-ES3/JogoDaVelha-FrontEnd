import type { CSSProperties } from 'react'
import { useServerTimer } from '../../hooks/useServerTimer'
import type { TimerDeadline } from '../../lib/timer'

export interface TimerBarProps {
  /** Prazo do servidor; null = sem contagem (trilha vazia, mesmo tamanho) */
  deadline: TimerDeadline | null
  /** Cor do lado do jogador (cor do personagem). Padrão: branco dos botões */
  color?: string
  /** A partir de quantos segundos a barra fica vermelha (perigo) */
  warnAtSeconds?: number
  showSeconds?: boolean
  /** Vertical para a coluna da Arena; esvazia de cima para baixo */
  vertical?: boolean
  /** Nome acessível, ex: "Tempo do turno" */
  label?: string
  className?: string
}

/**
 * Barra de tempo para turnos (10s/5s), Preparação (20s), sorteio (8s) e revanche (15s).
 * Só mostra o tempo do servidor: não avisa quando acaba, porque timeout é decisão do servidor.
 */
export function TimerBar({
  deadline,
  color = 'var(--color-primary)',
  warnAtSeconds = 3,
  showSeconds = true,
  vertical = false,
  label = 'Tempo restante',
  className = '',
}: TimerBarProps) {
  const timer = useServerTimer(deadline)
  const seconds = timer?.remainingSeconds ?? 0
  const progress = timer?.progress ?? 0
  const warning = timer !== null && timer.remainingMs > 0 && seconds <= warnAtSeconds
  const fill = warning ? 'var(--color-danger)' : color

  return (
    <div
      className={`flex items-center gap-2 ${vertical ? 'h-full flex-col-reverse' : 'w-full'} ${className}`}
    >
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={deadline?.durationSeconds ?? 0}
        aria-valuenow={seconds}
        aria-valuetext={seconds === 1 ? '1 segundo' : `${seconds} segundos`}
        data-warning={warning || undefined}
        className={`overflow-hidden rounded-full bg-bg-raised ${vertical ? 'w-2 flex-1' : 'h-2 flex-1'}`}
      >
        <div
          data-fill
          className={`size-full rounded-full transition-transform duration-100 ease-linear ${vertical ? 'origin-bottom' : 'origin-left'}`}
          style={
            {
              backgroundColor: fill,
              boxShadow: `0 0 10px ${fill}`,
              transform: vertical ? `scaleY(${progress})` : `scaleX(${progress})`,
            } as CSSProperties
          }
        />
      </div>
      {showSeconds && (
        // Largura fixa e números tabulares: a contagem não empurra o layout
        <span
          aria-hidden="true"
          className="w-[2ch] text-right font-mono text-sm font-medium tabular-nums"
          style={{ color: fill }}
        >
          {seconds}
        </span>
      )}
    </div>
  )
}
