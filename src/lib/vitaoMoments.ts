// Detecta os momentos do Vitão pela MUDANÇA entre dois retratos das stores (FE-44). Lógica pura,
// sem React e sem ler stores: o hook tira os retratos e passa para cá. As stores só mudam por
// evento do servidor, então tudo o que sai daqui já está confirmado.
import type { Cell, MatchOutcome, PlayerSlot } from '../types/game'
import type { VitaoMoment, VitaoSide } from './vitao'

export interface VitaoSnapshot {
  cells: Cell[]
  /** Última habilidade resolvida: a store troca o objeto a cada habilidade nova */
  lastAbility: { by: PlayerSlot; absorbed: boolean; noEffect: boolean } | null
  lastTimeout: { player: PlayerSlot } | null
  roundEnd: { winner: PlayerSlot | null } | null
  outcome: MatchOutcome | null
  /** Hora em que o MATCH_END chegou; null se o resultado veio de um snapshot de reconexão */
  outcomeReceivedAt: number | null
  /** Hora em que o round entrou em jogo (depois do sorteio); null em snapshot de reconexão */
  introStartedAt: number | null
  /** Hora em que o ROUND_START chegou; null em snapshot de reconexão */
  roundStartedAt: number | null
  suddenDeath: boolean
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
    })
  }

  const timeout = next.lastTimeout
  if (timeout && timeout !== prev.lastTimeout) {
    moments.push({ kind: 'TIMEOUT', by: side(timeout.player, me) })
  }

  const roundEnd = next.roundEnd
  if (roundEnd && roundEnd !== prev.roundEnd) {
    moments.push({
      kind: 'ROUND_END',
      winner: roundEnd.winner === null ? 'DRAW' : side(roundEnd.winner, me),
    })
  }

  // Entrada da Morte Súbita: o round 3 entra em jogo depois do sorteio
  if (
    next.suddenDeath &&
    next.introStartedAt !== null &&
    next.introStartedAt !== prev.introStartedAt
  ) {
    moments.push({ kind: 'SUDDEN_DEATH_START' })
  }

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
