// Motor de reações do Vitão (FE-44)
// Recebe o que aconteceu, a hora, a última fala e o filtro, e devolve a reação e a fala, ou nada. Quem chama (o hook) é que observa as stores.

/** Expressões da arte do Vitão (FE-41) */
export type VitaoExpression =
  'NORMAL' | 'RINDO' | 'DEBOCHADO' | 'BRAVO' | 'MUITO_BRAVO' | 'SURPRESO' | 'DORMINDO' | 'DIABO'

/** De quem é o momento, do ponto de vista de quem está jogando */
export type VitaoSide = 'ME' | 'OPPONENT'

export type VitaoMoment =
  | { kind: 'MOVE'; by: VitaoSide }
  | { kind: 'ABILITY'; by: VitaoSide; absorbed: boolean; noEffect: boolean }
  | { kind: 'TIMEOUT'; by: VitaoSide }
  | { kind: 'ROUND_END'; winner: VitaoSide | 'DRAW' }
  | { kind: 'SUDDEN_DEATH_START' }
  | { kind: 'WO'; winner: VitaoSide }

export type VitaoLineKey =
  | 'MOVE_ME'
  | 'MOVE_OPPONENT'
  | 'ABILITY_ME'
  | 'ABILITY_OPPONENT'
  | 'ABILITY_ABSORBED'
  | 'ABILITY_NO_EFFECT'
  | 'TIMEOUT_ME'
  | 'TIMEOUT_OPPONENT'
  | 'ROUND_WIN_ME'
  | 'ROUND_WIN_OPPONENT'
  | 'ROUND_DRAW'
  | 'SUDDEN_DEATH_START'
  | 'WO_WIN_ME'
  | 'WO_WIN_OPPONENT'

export interface VitaoLine {
  text: string
  expression: VitaoExpression
  /** Fala sem filtro: some quando o filtro das Configurações está ligado */
  explicit?: boolean
}

/** Falas por momento: a versão normal e a versão "Diabo" (Morte Súbita) */
export type VitaoLines = Partial<Record<VitaoLineKey, { normal: VitaoLine[]; devil: VitaoLine[] }>>

/** No máximo 1 fala a cada 6s */
/** No máximo 1 fala a cada 6s */
export const VITAO_COOLDOWN_SECONDS = 6
export const VITAO_COOLDOWN_MS = VITAO_COOLDOWN_SECONDS * 1000

export interface VitaoContext {
  /** Hora atual (ms) */
  now: number
  /** Hora da última fala (ms), ou null se ainda não falou */
  lastSpeechAt: number | null
  /** Morte Súbita: o Vitão vira o Diabo */
  suddenDeath: boolean
  /** Filtro das Configurações ligado: sem as falas `explicit` */
  filterOn: boolean
  /** Sorteio da fala (padrão: Math.random). Existe para os testes */
  random?: () => number
}

export interface VitaoReaction {
  text: string
  expression: VitaoExpression
  devil: boolean
  /** Momento grande (fim de round, Morte Súbita, W.O.) */
  big: boolean
  moment: VitaoMoment
}

/** Quanto maior, mais importante. Os momentos grandes passam na frente dos pequenos */
const PRIORITY: Record<VitaoMoment['kind'], number> = {
  MOVE: 1,
  ABILITY: 2,
  TIMEOUT: 2,
  ROUND_END: 3,
  SUDDEN_DEATH_START: 3,
  WO: 3,
}

const BIG_PRIORITY = 3

export const momentPriority = (moment: VitaoMoment) => PRIORITY[moment.kind]

export const isBigMoment = (moment: VitaoMoment) => momentPriority(moment) >= BIG_PRIORITY

/** Qual conjunto de falas serve para o momento */
export function lineKey(moment: VitaoMoment): VitaoLineKey {
  switch (moment.kind) {
    case 'MOVE':
      return moment.by === 'ME' ? 'MOVE_ME' : 'MOVE_OPPONENT'
    case 'ABILITY':
      if (moment.absorbed) return 'ABILITY_ABSORBED'
      if (moment.noEffect) return 'ABILITY_NO_EFFECT'
      return moment.by === 'ME' ? 'ABILITY_ME' : 'ABILITY_OPPONENT'
    case 'TIMEOUT':
      return moment.by === 'ME' ? 'TIMEOUT_ME' : 'TIMEOUT_OPPONENT'
    case 'ROUND_END':
      if (moment.winner === 'DRAW') return 'ROUND_DRAW'
      return moment.winner === 'ME' ? 'ROUND_WIN_ME' : 'ROUND_WIN_OPPONENT'
    case 'SUDDEN_DEATH_START':
      return 'SUDDEN_DEATH_START'
    case 'WO':
      return moment.winner === 'ME' ? 'WO_WIN_ME' : 'WO_WIN_OPPONENT'
  }
}

/**
 * Decide a reação do Vitão para os momentos que acabaram de chegar (todos já confirmados pelo
 * servidor). Devolve null se ele deve ficar quieto: sem momentos, dentro dos 6s da última fala,
 * sem fala disponível ou todas filtradas.
 */
export function decideVitaoReaction(
  moments: VitaoMoment[],
  ctx: VitaoContext,
  lines: VitaoLines,
): VitaoReaction | null {
  if (moments.length === 0) return null
  if (ctx.lastSpeechAt !== null && ctx.now - ctx.lastSpeechAt < VITAO_COOLDOWN_MS) return null

  // Maior prioridade; em empate, o mais recente (o último da lista)
  const moment = moments.reduce((best, m) => (momentPriority(m) >= momentPriority(best) ? m : best))

  const entry = lines[lineKey(moment)]
  if (!entry) return null

  const devil = ctx.suddenDeath
  const pool = devil && entry.devil.length > 0 ? entry.devil : entry.normal
  const allowed = ctx.filterOn ? pool.filter((line) => !line.explicit) : pool

  const random = ctx.random ?? Math.random
  const line = allowed[Math.floor(random() * allowed.length)]
  if (!line) return null

  return {
    text: line.text,
    expression: devil ? 'DIABO' : line.expression,
    devil,
    big: isBigMoment(moment),
    moment,
  }
}
