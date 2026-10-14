// Resolução das 10 habilidades no servidor simulado [RF-ARN-03]. Funções puras: recebem o
// tabuleiro e devolvem o novo, sem mexer no original.
import { ABILITY_INFO } from '../../constants/abilities'
import { BOARD_SIZE, EFFECT_DURATION_TURNS } from '../../constants/game'
import { otherSlot } from '../../lib/match'
import type { AbilityId, Cell, CellEffectKind, PlayerSlot } from '../../types/game'

/** Quem pôs cada Escudo: ele só bloqueia o oponente de quem o colocou */
export type ShieldOwners = Partial<Record<number, PlayerSlot>>

export interface AbilityRequest {
  cells: readonly Cell[]
  shieldOwners: ShieldOwners
  actor: PlayerSlot
  ability: AbilityId
  targetCell?: number
  destinationCell?: number
  /** Turnos restantes do Campo de Força do oponente */
  opponentForceField: number
  random: () => number
}

export type AbilityOutcome =
  | { ok: false; code: string; message: string }
  | {
      ok: true
      cells: Cell[]
      shieldOwners: ShieldOwners
      /** Anulada pelo Campo de Força [RN-ARN-04] */
      absorbed: boolean
      /** Sem casa livre (Tornado/Troca Rápida [RN-ARN-05]) ou peça com Reforço */
      noEffect: boolean
      targetCell: number | null
      destinationCell: number | null
      hourglassFor?: PlayerSlot
      silence?: PlayerSlot
      forceFieldFor?: PlayerSlot
    }

const has = (cell: Cell, kind: CellEffectKind) => cell.effects.some((e) => e.kind === kind)

/** Casa que o jogador não pode marcar: Escudo do oponente */
export const isBlockedFor = (
  cells: readonly Cell[],
  shieldOwners: ShieldOwners,
  index: number,
  slot: PlayerSlot,
) => has(cells[index], 'ESCUDO') && shieldOwners[index] !== slot

/** Casa vazia e sem Escudo: destino válido para mover uma peça */
export const isFree = (cell: Cell) => cell.owner === null && !has(cell, 'ESCUDO')

/**
 * Casas vizinhas, incluindo as diagonais. [A VALIDAR COM O BACK] A ERS diz "casa adjacente"
 * sem dizer se a diagonal conta.
 */
export function adjacentCells(index: number, size = BOARD_SIZE): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const result: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr
      const c = col + dc
      if ((dr || dc) && r >= 0 && r < size && c >= 0 && c < size) result.push(r * size + c)
    }
  }
  return result
}

const pick = <T>(items: readonly T[], random: () => number): T | undefined =>
  items[Math.floor(random() * items.length)]

const withEffect = (cell: Cell, kind: CellEffectKind): Cell => ({
  ...cell,
  effects: [
    ...cell.effects.filter((e) => e.kind !== kind),
    { kind, turnsLeft: EFFECT_DURATION_TURNS },
  ],
})

/** Move a peça (com Congelar/Reforço junto) de uma casa para outra */
function movePiece(cells: Cell[], from: number, to: number) {
  cells[to] = { ...cells[to], owner: cells[from].owner, effects: cells[from].effects }
  cells[from] = { ...cells[from], owner: null, effects: [] }
}

/** Fim de cada turno: os contadores caem 1 e o efeito some no 0 [RN-ARN-07] */
export function tickEffects(
  cells: readonly Cell[],
  shieldOwners: ShieldOwners,
): { cells: Cell[]; shieldOwners: ShieldOwners } {
  const owners = { ...shieldOwners }
  const next = cells.map((cell) => {
    const effects = cell.effects
      .map((e) => ({ ...e, turnsLeft: e.turnsLeft - 1 }))
      .filter((e) => e.turnsLeft > 0)
    if (!effects.some((e) => e.kind === 'ESCUDO')) delete owners[cell.index]
    return { ...cell, effects }
  })
  return { cells: next, shieldOwners: owners }
}

const invalid = (message: string): AbilityOutcome => ({
  ok: false,
  code: 'INVALID_TARGET',
  message,
})

export function resolveAbility(req: AbilityRequest): AbilityOutcome {
  const { actor, ability, random } = req
  const info = ABILITY_INFO[ability]
  const opponent = otherSlot(actor)
  const cells = req.cells.map((c) => ({ ...c, effects: [...c.effects] }))
  const shieldOwners = { ...req.shieldOwners }
  const target = req.targetCell
  const targetCell = cells[target ?? -1]

  // Alvo
  if (info.target === 'OPPONENT_PIECE' && targetCell?.owner !== opponent) {
    return invalid('Escolha uma peça do oponente.')
  }
  if (info.target === 'OWN_PIECE' && targetCell?.owner !== actor) {
    return invalid('Escolha uma peça sua.')
  }
  if (info.target === 'EMPTY_CELL' && (!targetCell || !isFree(targetCell))) {
    return invalid('Escolha uma casa vazia.')
  }
  const destination = req.destinationCell
  if (
    info.needsDestination &&
    destination !== undefined &&
    (target === undefined ||
      !adjacentCells(target).includes(destination) ||
      !isFree(cells[destination]))
  ) {
    return { ok: false, code: 'INVALID_DESTINATION', message: 'Escolha uma casa vizinha vazia.' }
  }

  const base = {
    ok: true as const,
    cells,
    shieldOwners,
    absorbed: false,
    noEffect: false,
    targetCell: info.target === 'NONE' ? null : (target ?? null),
    destinationCell: null as number | null,
  }

  // Campo de Força do oponente anula a primeira ofensiva; nada é rebatido [RN-ARN-04]
  if (info.blockedByForceField && req.opponentForceField > 0) {
    return { ...base, cells: [...req.cells], absorbed: true }
  }

  const reinforced = targetCell !== undefined && has(targetCell, 'REFORCO')
  const t = target as number

  switch (ability) {
    case 'BOMBA':
      if (reinforced) return { ...base, noEffect: true }
      cells[t] = { ...cells[t], owner: null, effects: [] }
      return base

    case 'ESCUDO':
      cells[t] = withEffect(cells[t], 'ESCUDO')
      shieldOwners[t] = actor
      return base

    case 'AMPULHETA':
      return { ...base, hourglassFor: opponent }

    case 'SILENCIO':
      return { ...base, silence: opponent }

    case 'CAMPO_DE_FORCA':
      return { ...base, forceFieldFor: actor }

    case 'CONGELAR':
      cells[t] = withEffect(cells[t], 'CONGELAR')
      return base

    case 'REFORCO':
      cells[t] = withEffect(cells[t], 'REFORCO')
      return base

    case 'TORNADO':
    case 'TROCA_RAPIDA': {
      if (ability === 'TORNADO' && reinforced) return { ...base, noEffect: true }
      const to =
        destination ??
        pick(
          adjacentCells(t).filter((i) => isFree(cells[i])),
          random,
        )
      if (to === undefined) return { ...base, noEffect: true } // [RN-ARN-05]
      movePiece(cells, t, to)
      return { ...base, destinationCell: to }
    }

    case 'BURACO_NEGRO': {
      if (reinforced) return { ...base, noEffect: true }
      const to = pick(
        cells.filter((c) => c.index !== t && isFree(c)).map((c) => c.index),
        random,
      )
      if (to === undefined) return { ...base, noEffect: true }
      movePiece(cells, t, to)
      return { ...base, destinationCell: to }
    }
  }
}
