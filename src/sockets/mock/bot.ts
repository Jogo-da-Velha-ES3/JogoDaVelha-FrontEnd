// Decisões do oponente automático do servidor simulado: ganha se der, bloqueia se precisar,
// às vezes usa uma habilidade, senão joga numa casa livre (preferindo o centro).
import { ABILITY_INFO } from '../../constants/abilities'
import { otherSlot } from '../../lib/match'
import { findWinningLine } from '../../lib/winCheck'
import type { AbilityId, Cell, DeckSlot, PlayerSlot } from '../../types/game'
import { isBlockedFor, isFree, type ShieldOwners } from './abilities'

export type BotAction =
  { kind: 'MOVE'; cell: number } | { kind: 'ABILITY'; ability: AbilityId; targetCell?: number }

interface BotInput {
  cells: readonly Cell[]
  shieldOwners: ShieldOwners
  me: PlayerSlot
  deck: readonly DeckSlot[]
  silenced: boolean
  random: () => number
  /** Chance de usar uma habilidade quando não há jogada de vitória ou bloqueio */
  abilityChance?: number
}

const CENTER = [5, 6, 9, 10]

const pick = <T>(items: readonly T[], random: () => number): T | undefined =>
  items[Math.floor(random() * items.length)]

function wouldWin(cells: readonly Cell[], index: number, slot: PlayerSlot) {
  const next = cells.map((c) => (c.index === index ? { ...c, owner: slot } : c))
  return findWinningLine(next, slot) !== null
}

function abilityTarget(
  ability: AbilityId,
  cells: readonly Cell[],
  playable: number[],
  me: PlayerSlot,
  random: () => number,
): { targetCell?: number } | null {
  const pieces = (slot: PlayerSlot) => cells.filter((c) => c.owner === slot).map((c) => c.index)
  switch (ABILITY_INFO[ability].target) {
    case 'NONE':
      return {}
    case 'OPPONENT_PIECE': {
      const cell = pick(pieces(otherSlot(me)), random)
      return cell === undefined ? null : { targetCell: cell }
    }
    case 'OWN_PIECE': {
      const cell = pick(pieces(me), random)
      return cell === undefined ? null : { targetCell: cell }
    }
    case 'EMPTY_CELL': {
      const cell = pick(
        playable.filter((i) => isFree(cells[i])),
        random,
      )
      return cell === undefined ? null : { targetCell: cell }
    }
  }
}

export function chooseBotAction({
  cells,
  shieldOwners,
  me,
  deck,
  silenced,
  random,
  abilityChance = 0.3,
}: BotInput): BotAction | null {
  const playable = cells
    .filter((c) => c.owner === null && !isBlockedFor(cells, shieldOwners, c.index, me))
    .map((c) => c.index)

  const winning = playable.find((i) => wouldWin(cells, i, me))
  if (winning !== undefined) return { kind: 'MOVE', cell: winning }

  const blocking = playable.find((i) => wouldWin(cells, i, otherSlot(me)))
  if (blocking !== undefined) return { kind: 'MOVE', cell: blocking }

  if (!silenced && random() < abilityChance) {
    const options = deck
      .filter((slot) => !slot.usedThisRound)
      .map((slot) => ({
        ability: slot.ability,
        target: abilityTarget(slot.ability, cells, playable, me, random),
      }))
      .filter((o) => o.target !== null)
    const chosen = pick(options, random)
    if (chosen) return { kind: 'ABILITY', ability: chosen.ability, ...chosen.target }
  }

  const center = playable.filter((i) => CENTER.includes(i))
  const cell = pick(center.length > 0 ? center : playable, random)
  return cell === undefined ? null : { kind: 'MOVE', cell }
}
