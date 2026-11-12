// Detecta os momentos do Vitão pela MUDANÇA entre dois retratos das stores (FE-44). Lógica pura,
// sem React e sem ler stores: o hook tira os retratos e passa para cá. As stores só mudam por
// evento do servidor, então tudo o que sai daqui já está confirmado.
import type { AbilityId, Cell, MatchOutcome, PlayerSlot } from '../types/game'
import { isMatchPoint, otherSlot, type Score } from './match'
import type { VitaoMoment, VitaoSide } from './vitao'

export interface VitaoSnapshot {
  cells: Cell[]
  /** Última habilidade resolvida: a store troca o objeto a cada habilidade nova */
  lastAbility: {
    by: PlayerSlot
    absorbed: boolean
    noEffect: boolean
    /** Qual habilidade foi (nome do campo no payload do ABILITY_RESOLVED) */
    ability?: AbilityId
  } | null
  lastTimeout: {
    player: PlayerSlot
    /** Estouros seguidos de quem perdeu a vez */
    consecutiveTimeouts: number
  } | null
  /** O oponente está conectado (PLAYER_DISCONNECTED / PLAYER_RECONNECTED) */
  opponentConnected: boolean
  roundEnd: { winner: PlayerSlot | null } | null
  outcome: MatchOutcome | null
  /** Hora em que o MATCH_END chegou; null se o resultado veio de um snapshot de reconexão */
  outcomeReceivedAt: number | null
  /** Hora em que o round entrou em jogo (depois do sorteio); null em snapshot de reconexão */
  introStartedAt: number | null
  /** Hora em que o ROUND_START chegou; null em snapshot de reconexão */
  roundStartedAt: number | null
  suddenDeath: boolean
  /** Placar como o servidor mandou */
  score: Score
}

const side = (slot: PlayerSlot, me: PlayerSlot): VitaoSide => (slot === me ? 'ME' : 'OPPONENT')

const occupied = (cells: Cell[]) => cells.filter((cell) => cell.owner !== null).length

export function momentsFromChange(
  prev: VitaoSnapshot,
  next: VitaoSnapshot,
  me: PlayerSlot,
): VitaoMoment[] {
  const moments: VitaoMoment[] = []

  // Jogada: aparece exatamente 1 peça nova (o tabuleiro também muda no fim do turno, no começo do
  // round e com habilidades, sem peça nova). Um tabuleiro vazio que ganha 1 peça sem ROUND_START
  // é a recarga de uma reconexão, não uma jogada
  const before = occupied(prev.cells)
  if (occupied(next.cells) === before + 1) {
    const fromReconnect = before === 0 && next.roundStartedAt === null
    const placed = next.cells.find((c) => c.owner !== null && prev.cells[c.index]?.owner === null)
    if (!fromReconnect && placed?.owner) {
      moments.push({ kind: 'MOVE', by: side(placed.owner, me) })
    }
  }

  const ability = next.lastAbility
  if (ability && ability !== prev.lastAbility) {
    moments.push({
      kind: 'ABILITY',
      by: side(ability.by, me),
      absorbed: ability.absorbed,
      noEffect: ability.noEffect,
      abilityId: ability.ability,
    })
  }

  const timeout = next.lastTimeout
  if (timeout && timeout !== prev.lastTimeout) {
    moments.push({
      kind: 'TIMEOUT',
      by: side(timeout.player, me),
      count: timeout.consecutiveTimeouts,
    })
  }

  // Oponente caiu: o aviso da Arena fica só com a informação e a piada é do Vitão
  if (prev.opponentConnected && !next.opponentConnected) {
    moments.push({ kind: 'OPPONENT_DISCONNECTED' })
  }

  const roundEnd = next.roundEnd
  if (roundEnd && roundEnd !== prev.roundEnd) {
    moments.push({
      kind: 'ROUND_END',
      winner: roundEnd.winner === null ? 'DRAW' : side(roundEnd.winner, me),
    })
  }

  // O round entra em jogo depois do sorteio (snapshot de reconexão vem sem a hora)
  const enteredPlay = next.introStartedAt !== null && next.introStartedAt !== prev.introStartedAt

  // Match point: a mesma regra do banner (isMatchPoint). Na Morte Súbita não, porque é o round
  // decisivo e ela tem a fala própria
  if (enteredPlay && !next.suddenDeath && isMatchPoint(next.score)) {
    const mine = next.score[me]
    const theirs = next.score[otherSlot(me)]
    if (mine !== theirs) {
      moments.push({ kind: 'MATCH_POINT', leader: mine > theirs ? 'ME' : 'OPPONENT' })
    }
  }

  // Entrada da Morte Súbita: o round 3 entra em jogo
  if (enteredPlay && next.suddenDeath) moments.push({ kind: 'SUDDEN_DEATH_START' })

  // W.O.: só quando o MATCH_END acabou de chegar (repetido ou vindo de snapshot, não)
  const { outcome } = next
  if (
    outcome?.kind === 'WO' &&
    next.outcomeReceivedAt !== null &&
    next.outcomeReceivedAt !== prev.outcomeReceivedAt
  ) {
    moments.push({ kind: 'WO', winner: side(outcome.winner, me) })
  }

  return moments
}
