import { classifyResult, type ResultKind } from '../../lib/result'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { RematchPanel } from './RematchPanel'

export interface ResultScreenProps {
  /** "Voltar ao Lobby". Padrão do RematchPanel: sai da sala e vai para o Hub */
  onLeave?: () => void
}

// Títulos provisórios, os mesmos do placeholder antigo. A Task 2 da FE-15 troca por textos e
// cores próprios de cada tipo de resultado.
const TITLES: Record<ResultKind, string> = {
  WIN_FLAWLESS: 'Vitória',
  WIN: 'Vitória',
  LOSS: 'Derrota',
  DRAW: 'Empate absoluto',
  WO_WIN: 'Vitória por W.O.',
  WO_LOSS: 'Derrota por W.O.',
}

/** Coins desta partida como o servidor mandou; sem valor, texto neutro (nunca "+0") */
function coinsLabel(amount: number | undefined): string {
  if (amount === undefined) return 'Coins já creditados'
  return amount > 0 ? `+${amount} Coins` : '0 Coins'
}

/**
 * Tela de Resultado (FE-15) [RF-POS-01]: título, placar, Coins e, na coluna direita, a revanche
 * e o "Voltar ao Lobby" (FE-29). Só lê as stores: vencedor, placar e Coins vêm do servidor.
 * Em paisagem, esboço Tela 8: duas colunas, painel do resultado à esquerda.
 */
export function ResultScreen({ onLeave }: ResultScreenProps) {
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const outcome = useMatchStore((s) => s.outcome)
  const score = useMatchStore((s) => s.score)
  const coins = useMatchStore((s) => s.coins)
  const result = classifyResult(outcome, score, me)

  return (
    <section
      aria-label="Resultado"
      className="flex min-h-0 flex-1 gap-3.5 px-3 short:gap-2.5 short:px-2"
    >
      {/* Painel do resultado (esboço: .col.center com borda e raio 12) */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-line p-1.5 text-center">
        {result ? (
          <h1 className="font-display text-4xl leading-none font-extrabold tracking-wide text-primary uppercase short:text-3xl">
            {TITLES[result.kind]}
          </h1>
        ) : (
          // O servidor ainda não mandou o resultado: nada de "Derrota" por engano
          <p
            role="status"
            className="font-display text-2xl font-bold tracking-wide text-text-muted uppercase short:text-xl"
          >
            Apurando o resultado…
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 short:gap-1.5">
        {result && (
          <>
            <p className="font-display text-2xl font-bold tabular-nums short:text-xl">
              {result.mine} × {result.theirs}
            </p>
            <p className="font-mono text-coin">{coinsLabel(coins?.[me])}</p>
          </>
        )}
        <RematchPanel onLeave={onLeave} />
      </div>
    </section>
  )
}
