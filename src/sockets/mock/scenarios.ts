import type { RoundResult } from '../../lib/match'

export type ScenarioId = 'normal' | 'vitoria' | 'empate-absoluto' | 'morte-subita' | 'wo'

export interface Scenario {
  id: ScenarioId
  /** Rounds que se jogam sozinhos, rápido, antes de passar o controle para você */
  scriptedRounds: RoundResult[]
  /** O bot não joga: estoura o tempo até perder por W.O. */
  botIdle: boolean
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  normal: { id: 'normal', scriptedRounds: [], botIdle: false },
  vitoria: { id: 'vitoria', scriptedRounds: ['P1', 'P1'], botIdle: false },
  'empate-absoluto': { id: 'empate-absoluto', scriptedRounds: ['P1', 'P2', null], botIdle: false },
  'morte-subita': { id: 'morte-subita', scriptedRounds: ['P2', 'P1'], botIdle: false },
  wo: { id: 'wo', scriptedRounds: [], botIdle: true },
}

const isScenarioId = (value: string | null | undefined): value is ScenarioId =>
  value !== null && value !== undefined && value in SCENARIOS

/** `?cenario=` na URL tem prioridade sobre `VITE_MOCK_SCENARIO`; sem nada, `normal` */
export function resolveScenario(search: string, envScenario?: string): Scenario {
  const fromUrl = new URLSearchParams(search).get('cenario')
  if (isScenarioId(fromUrl)) return SCENARIOS[fromUrl]
  if (isScenarioId(envScenario)) return SCENARIOS[envScenario]
  return SCENARIOS.normal
}
