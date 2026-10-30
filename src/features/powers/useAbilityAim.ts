import { useEffect, useState } from 'react'
import { ABILITY_INFO } from '../../constants/abilities'
import { getAimTargets } from '../../lib/abilityTargets'
import { sendCommand } from '../../sockets/gameClient'
import { useBoardStore } from '../../stores/boardStore'
import { usePowersStore, type Aim } from '../../stores/powersStore'
import { useRoomStore } from '../../stores/roomStore'
import type { AbilityId, PlayerSlot } from '../../types/game'

interface AbilityAimOptions {
  me: PlayerSlot
  /** Minha vez e conectado: fora disso a mira fecha */
  canAct: boolean
  /** Início do turno atual (timestamp do servidor): um envio só fica pendente no turno em que saiu */
  turnKey: number | null
}

const TARGET_HINT = {
  OPPONENT_PIECE: 'escolha uma peça do oponente',
  OWN_PIECE: 'escolha uma peça sua',
  EMPTY_CELL: 'escolha uma casa vazia',
} as const

/** Instrução da etapa atual da mira, ex: "Tornado: agora escolha a casa de destino" */
export function aimHint({ ability, selectedCell }: Aim): string {
  const info = ABILITY_INFO[ability]
  if (info.target === 'NONE') return info.name
  const step =
    info.needsDestination && selectedCell !== null
      ? 'agora escolha a casa de destino'
      : TARGET_HINT[info.target]
  return `${info.name}: ${step}`
}

/**
 * Mira de habilidade na Arena (FE-27): os alvos da etapa atual (a peça ou a casa e, no Tornado e na
 * Troca Rápida, depois o destino), o envio da intenção e a espera pelo servidor. Até o
 * ABILITY_RESOLVED (que fecha a mira) ou um erro, o tabuleiro não aceita outro toque. Esc, a vez
 * do oponente ou a queda da conexão fecham a mira.
 */
export function useAbilityAim({ me, canAct, turnKey }: AbilityAimOptions) {
  const cells = useBoardStore((s) => s.cells)
  const deck = usePowersStore((s) => s.deck)
  const aim = usePowersStore((s) => s.aim)
  const selectAimCell = usePowersStore((s) => s.selectAimCell)
  const cancelAim = usePowersStore((s) => s.cancelAim)
  const lastError = useRoomStore((s) => s.lastError)
  // O envio e o último erro conhecido naquele momento: um erro novo ou outro turno encerram a
  // espera (como no DeckHud)
  const [sent, setSent] = useState<{
    cell: number
    turnKey: number | null
    error: typeof lastError
  }>()

  const pending = aim !== null && sent?.turnKey === turnKey && sent.error === lastError
  const targets = aim && !pending ? getAimTargets(cells, aim.ability, me, aim.selectedCell) : []
  // Carta com alvo que agora não tem nenhum (ex: Bomba com o tabuleiro vazio) fica desabilitada
  const withoutTarget: AbilityId[] = deck
    .map((slot) => slot.ability)
    .filter(
      (ability) =>
        ABILITY_INFO[ability].target !== 'NONE' &&
        getAimTargets(cells, ability, me, null).length === 0,
    )

  useEffect(() => {
    if (aim && !canAct) cancelAim()
  }, [aim, canAct, cancelAim])

  useEffect(() => {
    if (!aim || pending) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelAim()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aim, pending, cancelAim])

  const send = (
    cell: number,
    payload: { ability: AbilityId; targetCell: number; destinationCell?: number },
  ) => {
    setSent({ cell, turnKey, error: lastError })
    sendCommand({ type: 'USE_ABILITY', payload })
  }

  /** Toque numa casa com a mira aberta: escolhe a peça ou manda a intenção. Nada muda no tabuleiro */
  const selectTarget = (cell: number) => {
    if (!aim || !canAct || !targets.includes(cell)) return
    const { ability, selectedCell } = aim
    if (!ABILITY_INFO[ability].needsDestination) return send(cell, { ability, targetCell: cell })
    if (selectedCell === null) return selectAimCell(cell)
    send(cell, { ability, targetCell: selectedCell, destinationCell: cell })
  }

  return {
    aim,
    targets,
    /** Casa destacada: a peça escolhida ou, enquanto espera o servidor, o alvo enviado */
    selected: aim?.selectedCell ?? (pending ? sent?.cell : undefined),
    pending,
    withoutTarget,
    hint: aim && !pending ? aimHint(aim) : null,
    selectTarget,
  }
}
