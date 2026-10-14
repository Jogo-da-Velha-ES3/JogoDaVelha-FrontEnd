import { useEffect, useState } from 'react'
import { Button, TimerBar } from '../components/ui'
import { ABILITY_INFO } from '../constants/abilities'
import { CHARACTER_INFO } from '../constants/characters'
import { ABILITIES, CHARACTERS } from '../constants/game'
import { Board } from '../features/board'
import { otherSlot } from '../lib/match'
import {
  createGameConnection,
  joinRoom,
  leaveRoom,
  onServerEventForDebug,
  sendCommand,
} from '../sockets/gameClient'
import { adjacentCells } from '../sockets/mock/abilities'
import { SCENARIOS, type ScenarioId } from '../sockets/mock/scenarios'
import { useBoardStore } from '../stores/boardStore'
import { useDraftStore } from '../stores/draftStore'
import { useMatchStore } from '../stores/matchStore'
import { usePowersStore } from '../stores/powersStore'
import { useRoomStore } from '../stores/roomStore'
import { useTimerStore } from '../stores/timerStore'
import type { AbilityId, CharacterId, PlayerSlot } from '../types/game'

const OUTCOME_TEXT = {
  WIN: 'Vitória',
  ABSOLUTE_DRAW: 'Empate absoluto',
  WO: 'W.O.',
} as const

// Painel de teste do servidor simulado (FE-35): uma partida inteira contra o bot, antes da
// Arena (FE-28) existir. Usa só stores + gameClient, como as telas de verdade vão usar.
export function MockMatchShowcase() {
  const room = useRoomStore()
  const draft = useDraftStore()
  const match = useMatchStore()
  const board = useBoardStore()
  const powers = usePowersStore()
  const turn = useTimerStore((s) => s.turn)
  const [picked, setPicked] = useState<AbilityId[]>([])
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    const off = onServerEventForDebug((e) => setLog((prev) => [e.type, ...prev].slice(0, 8)))
    // /vitrine?cenario=vitoria já começa a partida (prático para testar no preview)
    if (new URLSearchParams(window.location.search).has('cenario')) void joinRoom('0000')
    return () => {
      off()
      leaveRoom()
    }
  }, [])

  const me: PlayerSlot = room.mySlot ?? 'P1'
  const opp = otherSlot(me)
  const characters = Object.fromEntries(room.players.map((p) => [p.slot, p.character])) as Record<
    PlayerSlot,
    CharacterId | null
  >
  const myTurn = room.phase === 'PLAYING' && turn?.player === me
  const aim = powers.aim
  const aimInfo = aim ? ABILITY_INFO[aim.ability] : null

  const owners = board.cells.map((c) => c.owner)
  const indexesWhere = (fn: (owner: PlayerSlot | null, i: number) => boolean) =>
    owners.flatMap((o, i) => (fn(o, i) ? [i] : []))

  let selectable = indexesWhere((o) => o === null)
  if (aim && aimInfo) {
    if (aimInfo.needsDestination && aim.selectedCell !== null) {
      selectable = adjacentCells(aim.selectedCell).filter((i) => owners[i] === null)
    } else if (aimInfo.target === 'OPPONENT_PIECE') selectable = indexesWhere((o) => o === opp)
    else if (aimInfo.target === 'OWN_PIECE') selectable = indexesWhere((o) => o === me)
  }

  const start = (id: ScenarioId) => {
    setLog([])
    void joinRoom('0000', createGameConnection({ scenario: SCENARIOS[id] }))
  }

  const onCell = (index: number) => {
    if (!aim || !aimInfo) return sendCommand({ type: 'MOVE', payload: { cell: index } })
    if (aimInfo.needsDestination && aim.selectedCell === null) return powers.selectAimCell(index)
    sendCommand({
      type: 'USE_ABILITY',
      payload: aimInfo.needsDestination
        ? {
            ability: aim.ability,
            targetCell: aim.selectedCell ?? undefined,
            destinationCell: index,
          }
        : { ability: aim.ability, targetCell: index },
    })
  }

  const triggerAbility = (ability: AbilityId) => {
    if (ABILITY_INFO[ability].target === 'NONE') {
      sendCommand({ type: 'USE_ABILITY', payload: { ability } })
    } else powers.startAim(ability)
  }

  const togglePick = (ability: AbilityId) =>
    setPicked((prev) =>
      prev.includes(ability) ? prev.filter((a) => a !== ability) : [...prev, ability].slice(-2),
    )

  const name = (slot: PlayerSlot) => room.players.find((p) => p.slot === slot)?.nickname ?? slot
  const lastAbility = board.lastAbility

  return (
    <section aria-labelledby="partida" className="flex flex-col gap-3">
      <h2 id="partida" className="font-display text-lg font-bold text-text-muted uppercase">
        Partida simulada (servidor simulado)
      </h2>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
          <Button key={id} variant="secondary" size="sm" onClick={() => start(id)}>
            {id}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={leaveRoom}>
          Sair
        </Button>
      </div>

      <p className="font-mono text-xs text-text-muted">
        Conexão: {room.connection} · Fase: {room.phase ?? '—'} · Round {match.round}
        {match.suddenDeath && ' (Morte Súbita)'} · Placar {match.score.P1}×{match.score.P2} ·
        Estouros {match.consecutiveTimeouts.P1}/3 × {match.consecutiveTimeouts.P2}/3
      </p>

      {room.phase === 'DRAFT' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            Personagem (oponente: {draft.ready[opp] ? 'pronto' : 'escolhendo…'}):
          </p>
          <div className="flex flex-wrap gap-2">
            {CHARACTERS.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={draft.characters[me] === c ? 'primary' : 'secondary'}
                disabled={draft.characters[opp] === c}
                onClick={() => sendCommand({ type: 'DRAFT_CHARACTER', payload: { character: c } })}
              >
                {CHARACTER_INFO[c].name}
              </Button>
            ))}
          </div>
          <p className="text-sm">2 habilidades iniciais:</p>
          <div className="flex flex-wrap gap-2">
            {ABILITIES.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={picked.includes(a) ? 'primary' : 'ghost'}
                onClick={() => togglePick(a)}
              >
                {ABILITY_INFO[a].name}
              </Button>
            ))}
            <Button
              size="sm"
              disabled={picked.length !== 2}
              onClick={() =>
                sendCommand({
                  type: 'DRAFT_ABILITIES',
                  payload: { abilities: [picked[0], picked[1]] },
                })
              }
            >
              Confirmar
            </Button>
          </div>
        </div>
      )}

      {powers.drawOptions && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Sorteio da 3ª:</span>
          {powers.drawOptions.options.map((a) => (
            <Button
              key={a}
              size="sm"
              variant="secondary"
              onClick={() => sendCommand({ type: 'DRAW_PICK', payload: { ability: a } })}
            >
              {ABILITY_INFO[a].name}
            </Button>
          ))}
        </div>
      )}

      {room.code && (
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-[300px] w-full max-w-[440px]">
            <Board
              cells={board.cells}
              characters={characters}
              winningLine={board.winningLine}
              aim={aim ? { targets: selectable, selected: aim.selectedCell ?? undefined } : null}
              selectable={myTurn ? selectable : []}
              onCellSelect={onCell}
            />
          </div>
          <div className="flex min-w-56 flex-1 flex-col gap-2">
            <p className="font-display text-xl font-bold uppercase">
              {turn ? (turn.player === me ? 'Sua vez' : `Vez de ${name(opp)}`) : '—'}
            </p>
            <TimerBar
              deadline={turn}
              color={
                characters[turn?.player ?? me]
                  ? CHARACTER_INFO[characters[turn?.player ?? me]!].color
                  : undefined
              }
              warnAtSeconds={turn?.player === me ? 3 : 0}
              label="Tempo do turno"
            />
            <div className="flex flex-wrap gap-2">
              {powers.deck.map((slot) => (
                <Button
                  key={slot.ability}
                  size="sm"
                  variant={aim?.ability === slot.ability ? 'primary' : 'secondary'}
                  disabled={!myTurn || slot.usedThisRound}
                  onClick={() => triggerAbility(slot.ability)}
                >
                  {ABILITY_INFO[slot.ability].name}
                </Button>
              ))}
              {aim && (
                <Button size="sm" variant="ghost" onClick={powers.cancelAim}>
                  Cancelar mira
                </Button>
              )}
            </div>
            {lastAbility && (
              <p className="text-sm">
                {name(lastAbility.by)} usou {ABILITY_INFO[lastAbility.ability].name}
                {lastAbility.absorbed && ' — anulada pelo Campo de Força'}
                {lastAbility.noEffect && ' — sem efeito'}
              </p>
            )}
            {match.lastTimeout && (
              <p className="text-sm text-danger">
                Tempo esgotado: {name(match.lastTimeout.player)} (
                {match.lastTimeout.consecutiveTimeouts}/3)
              </p>
            )}
            {room.lastError && <p className="text-sm text-danger">{room.lastError.message}</p>}
            {match.outcome && (
              <div className="flex items-center gap-3">
                <p className="font-display text-xl font-bold uppercase">
                  {OUTCOME_TEXT[match.outcome.kind]}
                  {match.outcome.kind !== 'ABSOLUTE_DRAW' && ` de ${name(match.outcome.winner)}`} ·
                  +{match.coins?.[me] ?? 0} Coins
                </p>
                <Button
                  size="sm"
                  onClick={() => sendCommand({ type: 'REMATCH_REQUEST', payload: {} })}
                >
                  Revanche
                </Button>
              </div>
            )}
            <p className="font-mono text-[10px] text-text-muted">Eventos: {log.join(' · ')}</p>
          </div>
        </div>
      )}
    </section>
  )
}
