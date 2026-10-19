import type { RoundResult } from '../../lib/match'

export type ScenarioId =
  | 'normal'
  | 'vitoria'
  | 'empate-absoluto'
  | 'morte-subita'
  | 'virada'
  | 'wo'
  | 'derrota'
  | 'derrota-wo'

export interface Scenario {
  id: ScenarioId
  /** Rounds que se jogam sozinhos, rápido, antes de passar o controle para você */
  scriptedRounds: RoundResult[]
  /** O bot não joga: estoura o tempo até perder por W.O. */
  botIdle: boolean
  /**
   * Você fica ocioso: os seus turnos são curtos (`MOCK_TIMINGS.youIdleTurn`) e estouram sozinhos,
   * e os 3 seguidos dão W.O. ao bot [RN-ARN-01]. Só os cenários que usam isto mudam de turno.
   */
  youIdle?: boolean
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  normal: { id: 'normal', scriptedRounds: [], botIdle: false },
  vitoria: { id: 'vitoria', scriptedRounds: ['P1', 'P1'], botIdle: false },
  'empate-absoluto': { id: 'empate-absoluto', scriptedRounds: ['P1', 'P2', null], botIdle: false },
  'morte-subita': { id: 'morte-subita', scriptedRounds: ['P2', 'P1'], botIdle: false },
  // Regra de 18/10: empate + derrota (0×1) ainda vai para o round 3, que é seu
  virada: { id: 'virada', scriptedRounds: [null, 'P2'], botIdle: false },
  wo: { id: 'wo', scriptedRounds: [], botIdle: true },
  // FE-15: o Resultado de quem perde. O bot vence os dois rounds (0×2), ou você perde por W.O.
  derrota: { id: 'derrota', scriptedRounds: ['P2', 'P2'], botIdle: false },
  'derrota-wo': { id: 'derrota-wo', scriptedRounds: [], botIdle: false, youIdle: true },
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

/**
 * O que o bot faz no Resultado (FE-29), independente do cenário da partida:
 * - `aceita` / `recusa`: responde ao seu pedido de revanche
 * - `ignora`: não responde, e o pedido cai depois de 15s
 * - `pede`: ele mesmo pede revanche, e você aceita ou recusa
 * - `sai`: volta ao Lobby logo depois do fim da partida
 */
export const BOT_REMATCH_BEHAVIORS = ['aceita', 'recusa', 'ignora', 'pede', 'sai'] as const

export type BotRematch = (typeof BOT_REMATCH_BEHAVIORS)[number]

const isBotRematch = (value: string | null | undefined): value is BotRematch =>
  BOT_REMATCH_BEHAVIORS.some((b) => b === value)

/**
 * Queda do bot no primeiro turno dele (FE-20), por `?queda=` na URL:
 * - `volta`: cai, perde esse turno por tempo e volta
 * - `wo`: cai e não volta; os estouros seguem até o W.O. [RN-ARN-01]
 */
export type BotDrop = 'volta' | 'wo'

export function resolveBotDrop(search: string): BotDrop | null {
  const fromUrl = new URLSearchParams(search).get('queda')
  return fromUrl === 'volta' || fromUrl === 'wo' ? fromUrl : null
}

/** `?revanche=` na URL tem prioridade sobre `VITE_MOCK_REMATCH`; sem nada, `aceita` */
export function resolveBotRematch(search: string, envRematch?: string): BotRematch {
  const fromUrl = new URLSearchParams(search).get('revanche')
  if (isBotRematch(fromUrl)) return fromUrl
  if (isBotRematch(envRematch)) return envRematch
  return 'aceita'
}
