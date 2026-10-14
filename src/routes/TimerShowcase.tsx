import { useEffect, useState } from 'react'
import { Button, TimerBar } from '../components/ui'
import { CHARACTER_INFO } from '../constants/characters'
import {
  DRAW_PICK_SECONDS,
  PREPARATION_SECONDS,
  REMATCH_WINDOW_SECONDS,
  SUDDEN_DEATH_TURN_DURATION_SECONDS,
  TURN_DURATION_SECONDS,
} from '../constants/game'
import type { TimerDeadline } from '../lib/timer'
import { useClockStore } from '../stores/clockStore'

const DURATIONS = [
  { label: 'Turno', seconds: TURN_DURATION_SECONDS },
  { label: 'Morte Súbita', seconds: SUDDEN_DEATH_TURN_DURATION_SECONDS },
  { label: 'Preparação', seconds: PREPARATION_SECONDS },
  { label: 'Sorteio', seconds: DRAW_PICK_SECONDS },
  { label: 'Revanche', seconds: REMATCH_WINDOW_SECONDS },
]

// Simula um celular com o relógio 2s adiantado em relação ao servidor
const CLIENT_AHEAD_MS = 2000
const fakeServerTime = () => Date.now() - CLIENT_AHEAD_MS

// Demonstração do timer (FE-08): o prazo "vem do servidor" com a hora dele
export function TimerShowcase() {
  const [deadline, setDeadline] = useState<TimerDeadline | null>(null)
  const sync = useClockStore((s) => s.syncWithServer)
  const offsetMs = useClockStore((s) => s.offsetMs)

  useEffect(() => () => useClockStore.getState().reset(), [])

  const start = (seconds: number) => {
    const serverTime = fakeServerTime()
    sync(serverTime)
    setDeadline({ startedAt: serverTime, durationSeconds: seconds })
  }

  return (
    <section aria-labelledby="timer" className="flex flex-col gap-3">
      <h2 id="timer" className="font-display text-lg font-bold text-text-muted uppercase">
        Timer do servidor
      </h2>
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map(({ label, seconds }) => (
          <Button key={label} variant="secondary" size="sm" onClick={() => start(seconds)}>
            {label} {seconds}s
          </Button>
        ))}
      </div>
      <div className="flex items-stretch gap-6">
        <div className="flex max-w-md flex-1 flex-col justify-center gap-3">
          <figure className="flex flex-col gap-1">
            <TimerBar
              deadline={deadline}
              color={CHARACTER_INFO.O.color}
              label="Tempo da demonstração"
            />
            <figcaption className="font-mono text-xs text-text-muted">
              Horizontal, na cor do personagem (fica vermelha nos últimos 3s)
            </figcaption>
          </figure>
          <figure className="flex flex-col gap-1">
            <TimerBar deadline={null} label="Sem prazo" />
            <figcaption className="font-mono text-xs text-text-muted">
              Sem prazo (ex: entre um round e outro): fica vazia, sem mudar de tamanho
            </figcaption>
          </figure>
        </div>
        <figure className="flex h-28 flex-col items-center gap-1">
          <TimerBar
            deadline={deadline}
            vertical
            color={CHARACTER_INFO.X.color}
            label="Tempo vertical"
          />
          <figcaption className="font-mono text-xs text-text-muted">Vertical</figcaption>
        </figure>
      </div>
      <p className="max-w-xl font-mono text-xs text-text-muted">
        {offsetMs === 0
          ? `Este exemplo finge que o relógio do celular está ${CLIENT_AHEAD_MS / 1000}s adiantado em relação ao servidor. Clique numa duração para o "servidor" mandar o prazo.`
          : `Relógio do celular ${-offsetMs / 1000}s adiantado em relação ao servidor: o timer desconta essa diferença (correção de ${offsetMs} ms) e por isso começa cheio, como no servidor.`}
      </p>
    </section>
  )
}
