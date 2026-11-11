// Motor de reações do Vitão (FE-44)
// Recebe o que aconteceu, a hora, a última fala e o filtro, e devolve a reação e a fala, ou nada. Quem chama (o hook) é que observa as stores.
import { VITAO_COOLDOWN_SECONDS, VITAO_MOVE_COMMENT_CHANCE } from '../constants/game'
import type { AbilityId } from '../types/game'

/** Expressões da arte do Vitão (FE-41) */
export type VitaoExpression =
  'NORMAL' | 'RINDO' | 'DEBOCHADO' | 'BRAVO' | 'MUITO_BRAVO' | 'SURPRESO' | 'DORMINDO' | 'DIABO'

/** De quem é o momento, do ponto de vista de quem está jogando */
export type VitaoSide = 'ME' | 'OPPONENT'

export type VitaoMoment =
  | { kind: 'MOVE'; by: VitaoSide }
  | {
      kind: 'ABILITY'
      by: VitaoSide
      absorbed: boolean
      noEffect: boolean
      /** Qual habilidade foi usada (para a fala por habilidade do Rafik) */
      abilityId?: AbilityId
    }
  | {
      kind: 'TIMEOUT'
      by: VitaoSide
      /** Estouros seguidos de quem perdeu a vez (1, 2 ou 3) */
      count?: number
    }
  | { kind: 'OPPONENT_DISCONNECTED' }
  | { kind: 'ROUND_END'; winner: VitaoSide | 'DRAW' }
  /** Início do round com alguém em 1 vitória; `leader` é quem está na frente */
  | { kind: 'MATCH_POINT'; leader: VitaoSide }
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
  | 'OPPONENT_DISCONNECTED'
  | 'ROUND_WIN_ME'
  | 'ROUND_WIN_OPPONENT'
  | 'ROUND_DRAW'
  | 'MATCH_POINT_ME'
  | 'MATCH_POINT_OPPONENT'
  | 'SUDDEN_DEATH_START'
  | 'WO_WIN_ME'
  | 'WO_WIN_OPPONENT'

export interface VitaoLine {
  text: string
  expression: VitaoExpression
  /** Fala sem filtro: some quando o filtro das Configurações está ligado */
  explicit?: boolean
  /** Versão limpa de uma fala `explicit` (o [C] do Rafik): só aparece com o filtro ligado */
  filteredOnly?: boolean
  /** Nome do arquivo de áudio do Rafik, usado pela voz (FE-48) */
  audio?: string
}

/** Falas por momento: a versão normal e a versão "Diabo" (Morte Súbita) */
export type VitaoLines = Partial<Record<VitaoLineKey, { normal: VitaoLine[]; devil: VitaoLine[] }>>

/** No máximo 1 fala a cada 6s, menos nos momentos grandes */
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
  /** Momento grande (fim de round, match point, Morte Súbita, W.O.) */
  big: boolean
  moment: VitaoMoment
  /** Áudio da fala escolhida (FE-48) */
  audio?: string
}

/** Quanto maior, mais importante. Os momentos grandes passam na frente dos pequenos */
const PRIORITY: Record<VitaoMoment['kind'], number> = {
  MOVE: 1,
  ABILITY: 2,
  TIMEOUT: 2,
  OPPONENT_DISCONNECTED: 2,
  ROUND_END: 3,
  MATCH_POINT: 3,
  SUDDEN_DEATH_START: 3,
  WO: 3,
}

const BIG_PRIORITY = 3

export const momentPriority = (moment: VitaoMoment) => PRIORITY[moment.kind]

export const isBigMoment = (moment: VitaoMoment) => momentPriority(moment) >= BIG_PRIORITY

/** Quanto falta (ms) para o Vitão poder falar de novo: 0 se já pode */
export function cooldownLeft(now: number, lastSpeechAt: number | null): number {
  if (lastSpeechAt === null) return 0
  return Math.max(0, lastSpeechAt + VITAO_COOLDOWN_MS - now)
}

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
    case 'OPPONENT_DISCONNECTED':
      return 'OPPONENT_DISCONNECTED'
    case 'ROUND_END':
      if (moment.winner === 'DRAW') return 'ROUND_DRAW'
      return moment.winner === 'ME' ? 'ROUND_WIN_ME' : 'ROUND_WIN_OPPONENT'
    case 'MATCH_POINT':
      return moment.leader === 'ME' ? 'MATCH_POINT_ME' : 'MATCH_POINT_OPPONENT'
    case 'SUDDEN_DEATH_START':
      return 'SUDDEN_DEATH_START'
    case 'WO':
      return moment.winner === 'ME' ? 'WO_WIN_ME' : 'WO_WIN_OPPONENT'
  }
}

/**
 * Decide a reação do Vitão para os momentos que acabaram de chegar (todos já confirmados pelo
 * servidor). Devolve null se ele deve ficar quieto: sem momentos, momento pequeno dentro dos 6s da
 * última fala, jogada de peça fora do sorteio de 1 em 3, sem fala disponível ou todas filtradas.
 */
export function decideVitaoReaction(
  moments: VitaoMoment[],
  ctx: VitaoContext,
  lines: VitaoLines,
): VitaoReaction | null {
  const random = ctx.random ?? Math.random
  const inPause = cooldownLeft(ctx.now, ctx.lastSpeechAt) > 0
  const candidates = moments.filter((m) => {
    // Na pausa de 6s só os momentos grandes falam, na hora e no lugar da fala atual: esperar a
    // pausa acabar pareceria atraso
    if (inPause) return isBigMoment(m)
    // Jogada de peça: comenta só 1 em cada 3, para não falar o tempo todo
    return m.kind !== 'MOVE' || random() < VITAO_MOVE_COMMENT_CHANCE
  })
  if (candidates.length === 0) return null

  // Maior prioridade; em empate, o mais recente (o último da lista)
  const moment = candidates.reduce((best, m) =>
    momentPriority(m) >= momentPriority(best) ? m : best,
  )

  const entry = lines[lineKey(moment)]
  if (!entry) return null

  const devil = ctx.suddenDeath
  const pool = devil && entry.devil.length > 0 ? entry.devil : entry.normal
  const allowed = pool.filter((line) => (ctx.filterOn ? !line.explicit : !line.filteredOnly))

  const line = allowed[Math.floor(random() * allowed.length)]
  if (!line) return null

  return {
    text: line.text,
    expression: devil ? 'DIABO' : line.expression,
    devil,
    big: isBigMoment(moment),
    moment,
    audio: line.audio,
  }
}
