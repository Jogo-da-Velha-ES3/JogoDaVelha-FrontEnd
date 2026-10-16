import type { ABILITIES, CHARACTERS } from '../constants/game'

export type AbilityId = (typeof ABILITIES)[number]
export type CharacterId = (typeof CHARACTERS)[number]
export type PlayerSlot = 'P1' | 'P2'

/** Fase da sala, enviada pelo servidor no snapshot. Decide qual tela `/sala/:codigo` mostra. */
export type RoomPhase =
  | 'WAITING' // Host esperando adversário
  | 'MATCHED' // "MATCH FEITO!" + contagem de 3s
  | 'DRAFT' // Preparação (personagem + 2 habilidades iniciais)
  | 'VERSUS' // tela de Confronto
  | 'ROUND_DRAW' // sorteio da 3ª habilidade (8s)
  | 'PLAYING'
  | 'ROUND_END'
  | 'RESULT'

export type CellEffectKind = 'ESCUDO' | 'CONGELAR' | 'REFORCO'

export interface CellEffect {
  kind: CellEffectKind
  /** Turnos restantes; começa em 2 e cai ao final de cada turno [RN-ARN-07] */
  turnsLeft: number
}

export interface Cell {
  /** 0..15, da esquerda para a direita, de cima para baixo */
  index: number
  owner: PlayerSlot | null
  effects: CellEffect[]
}

export interface PlayerState {
  slot: PlayerSlot
  userId: string
  nickname: string
  character: CharacterId | null
  roundsWon: number
  /** Estouros de tempo seguidos, 0..3. Não zera na troca de round [RN-ARN-01] */
  consecutiveTimeouts: number
  /** Turnos restantes do Campo de Força; 0 = inativo */
  forceFieldTurnsLeft: number
  /** Silenciado: não pode usar habilidade no próximo turno */
  silenced: boolean
  connected: boolean
}

export type DeckSlotSource = 'INITIAL' | 'DRAWN'

export interface DeckSlot {
  ability: AbilityId
  source: DeckSlotSource
  usedThisRound: boolean
}

export interface TurnState {
  player: PlayerSlot
  /** Timestamp do servidor (ms) em que o turno começou */
  startedAt: number
  durationSeconds: number
}

export type MatchOutcome =
  | { kind: 'WIN'; winner: PlayerSlot; score: [number, number] }
  | { kind: 'ABSOLUTE_DRAW' }
  | { kind: 'WO'; winner: PlayerSlot }

export interface RoomSnapshot {
  code: string
  phase: RoomPhase
  players: PlayerState[]
  /** Quem sou eu nesta sala */
  mySlot: PlayerSlot
  round: number
  suddenDeath: boolean
  board: Cell[]
  turn: TurnState | null
  /** Só o meu deck: o do oponente nunca é enviado */
  myDeck: DeckSlot[]
  outcome: MatchOutcome | null
  serverTime: number
  // [A VALIDAR COM O BACK] Pedido ao Victor em 15/10 (FE-20): sem isto, quem recarrega no meio da
  // Preparação, do sorteio ou do Resultado volta com a tela incompleta. Opcionais até lá.
  /** Na Preparação: prazo dos 20s e quem já está pronto */
  draft?: { deadline: number; ready: Record<PlayerSlot, boolean> } | null
  /** No sorteio: as minhas 3 cartas e o prazo dos 8s (privado) */
  drawOptions?: { options: AbilityId[]; deadline: number } | null
  /** No Resultado: Coins creditados a cada lado */
  coins?: Record<PlayerSlot, number> | null
  /** No Resultado: pedido de revanche em aberto */
  rematch?: { by: PlayerSlot; deadline: number } | null
}
