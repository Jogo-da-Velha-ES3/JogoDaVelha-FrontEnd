import { useEffect, useState } from 'react'
import { Button } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import { ABILITIES, CHARACTERS } from '../../constants/game'
import { Board } from '../../features/board'
import { Arena, useOpponentDisconnect } from '../../features/match'
import { ResultScreen, useRoomExit } from '../../features/results'
import { otherSlot } from '../../lib/match'
import {
  getMockControls,
  joinRoom,
  leaveRoom,
  onServerEventForDebug,
  sendCommand,
} from '../../sockets/gameClient'
import { adjacentCells } from '../../sockets/mock/abilities'
import {
  BOT_REMATCH_BEHAVIORS,
  type BotRematch,
  resolveBotRematch,
  SCENARIOS,
  type ScenarioId,
} from '../../sockets/mock/scenarios'
import { useBoardStore } from '../../stores/boardStore'
import { useDraftStore } from '../../stores/draftStore'
import { useMatchStore } from '../../stores/matchStore'
import { usePowersStore } from '../../stores/powersStore'
import { useRoomStore } from '../../stores/roomStore'
import { useTimerStore } from '../../stores/timerStore'
import { showToast } from '../../stores/toastStore'
import type { AbilityId, PlayerSlot, RoomPhase } from '../../types/game'
import { ShowcaseBlock } from './ShowcaseLayout'

const SCENARIO_CARDS: { id: ScenarioId; title: string; description: string }[] = [
  {
    id: 'normal',
    title: 'Partida normal',
    description: 'Jogo completo: você escolhe personagem e cartas e joga cada turno contra o robô.',
  },
  {
    id: 'vitoria',
    title: 'Vitória rápida',
    description: 'Os rounds se jogam sozinhos e você vence por 2×0. Bom para ver o Resultado.',
  },
  {
    id: 'morte-subita',
    title: 'Morte Súbita',
    description: 'Fica 1×1 sozinho e o round 3 é seu, com só 5 segundos por turno.',
  },
  {
    id: 'virada',
    title: 'Virada',
    description: 'Empata o 1º round e o robô vence o 2º (0×1). No round 3, vença para empatar.',
  },
  {
    id: 'empate-absoluto',
    title: 'Empate absoluto',
    description: 'Tudo empata, até a Morte Súbita: +20 Coins para cada um.',
  },
  {
    id: 'wo',
    title: 'Vitória por W.O.',
    description: 'O robô não joga e perde por estourar o tempo 3 vezes. Jogue nos seus turnos.',
  },
  {
    id: 'derrota',
    title: 'Derrota',
    description:
      'O robô vence os dois primeiros rounds sozinho (0×2). Bom para ver o Resultado de quem perde.',
  },
  {
    id: 'derrota-wo',
    title: 'Derrota por W.O.',
    description:
      'Não jogue: seus turnos duram 2 segundos e estouram 3 vezes seguidas, e o robô vence por W.O.',
  },
]

const BOT_REMATCH_LABEL: Record<BotRematch, string> = {
  aceita: 'Aceita',
  recusa: 'Recusa',
  ignora: 'Não responde',
  pede: 'Pede revanche',
  sai: 'Sai da sala',
}

const ARENA_PHASES: RoomPhase[] = ['VERSUS', 'ROUND_DRAW', 'PLAYING', 'ROUND_END']

const initialScenario = (): ScenarioId | null => {
  const id = new URLSearchParams(window.location.search).get('cenario')
  return id && id in SCENARIOS ? (id as ScenarioId) : null
}

/**
 * Aba "Jogar contra o robô" da vitrine (FE-35 + FE-28): uma partida inteira contra o servidor
 * simulado, em passos guiados, com a tela do celular deitado mostrando cada fase.
 */
export function MockMatchShowcase() {
  const [scenario, setScenario] = useState<ScenarioId | null>(initialScenario)
  const [botRematch, setBotRematch] = useState<BotRematch>(() =>
    resolveBotRematch(window.location.search),
  )
  const [log, setLog] = useState<string[]>([])
  const room = useRoomStore()
  const match = useMatchStore()

  useEffect(() => {
    const off = onServerEventForDebug((e) => setLog((prev) => [e.type, ...prev].slice(0, 10)))
    // /vitrine?cenario=vitoria já começa a partida (prático para mandar o link para alguém)
    if (initialScenario()) void joinRoom('0000')
    return () => {
      off()
      leaveRoom()
    }
  }, [])

  const start = (id: ScenarioId) => {
    setScenario(id)
    setLog([])
    void joinRoom('0000', { mock: { scenario: SCENARIOS[id], botRematch } })
  }

  const stop = () => {
    leaveRoom()
    setScenario(null)
  }

  // Como na sala de verdade: quem pediu revanche e teve o pedido cancelado volta ao "Hub"
  useRoomExit((message) => {
    showToast({ message, tone: 'info' })
    stop()
  })

  return (
    <div className="flex flex-col gap-4">
      <ShowcaseBlock title="1. Escolha um cenário" hint="Dá para trocar a qualquer momento.">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIO_CARDS.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => start(card.id)}
                aria-pressed={scenario === card.id}
                className={[
                  'flex h-full w-full flex-col gap-1 rounded-xl border-2 p-3 text-left transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  scenario === card.id
                    ? 'border-primary bg-primary/10'
                    : 'border-line hover:border-primary/50',
                ].join(' ')}
              >
                <span className="font-display text-lg font-bold uppercase">{card.title}</span>
                <span className="text-xs text-text-muted">{card.description}</span>
              </button>
            </li>
          ))}
        </ul>
        <fieldset className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-2">
          <legend className="mb-1 text-xs text-text-muted">
            No fim da partida, o robô… (vale para a próxima partida que você começar)
          </legend>
          {BOT_REMATCH_BEHAVIORS.map((behavior) => (
            <Button
              key={behavior}
              size="sm"
              variant={botRematch === behavior ? 'primary' : 'ghost'}
              aria-pressed={botRematch === behavior}
              onClick={() => setBotRematch(behavior)}
            >
              {BOT_REMATCH_LABEL[behavior]}
            </Button>
          ))}
        </fieldset>
        {room.code && (
          <Button variant="secondary" size="sm" className="self-start" onClick={stop}>
            Encerrar partida
          </Button>
        )}
      </ShowcaseBlock>

      <ShowcaseBlock
        title="2. Jogue"
        hint="A caixa abaixo é a tela de um celular deitado. Siga o que aparece em “Agora”."
      >
        <NextStep />
        <PhoneFrame onPlayAgain={() => scenario && start(scenario)} onLeave={stop} />
        <DrawPicker />
        {room.code && <DropControls />}
        <p className="font-mono text-[11px] text-text-muted">
          Fase {room.phase ?? '—'} · Round {match.round} · Placar {match.score.P1}×{match.score.P2}{' '}
          · Estouros {match.consecutiveTimeouts.P1}/3 × {match.consecutiveTimeouts.P2}/3 · Conexão{' '}
          {room.connection}
        </p>
      </ShowcaseBlock>

      <details className="rounded-xl border border-line/60 bg-bg-deep/40 p-3">
        <summary className="cursor-pointer font-display font-bold tracking-wide uppercase">
          Avançado: testar habilidades
        </summary>
        <p className="mt-2 mb-3 text-xs text-text-muted">
          A Arena ainda não tem a mira de habilidade (é a FE-27). Para testar o servidor, use este
          tabuleiro: na sua vez, toque numa habilidade do deck e depois no alvo.
        </p>
        <AbilityTester />
      </details>

      <details className="rounded-xl border border-line/60 bg-bg-deep/40 p-3">
        <summary className="cursor-pointer font-display font-bold tracking-wide uppercase">
          Avançado: eventos do servidor
        </summary>
        <p className="mt-2 font-mono text-xs break-words text-text-muted">
          {log.length > 0 ? log.join(' · ') : 'Nenhum evento ainda.'}
        </p>
      </details>
    </div>
  )
}

/** A instrução do momento, em destaque */
function NextStep() {
  const room = useRoomStore()
  const draft = useDraftStore()
  const drawOptions = usePowersStore((s) => s.drawOptions)
  const turn = useTimerStore((s) => s.turn)
  const rematch = useMatchStore((s) => s.rematch)
  const rematchCancelled = useMatchStore((s) => s.rematchCancelled)
  const opponent = useOpponentDisconnect()
  const me = room.mySlot ?? 'P1'

  let text = 'Escolha um cenário acima para começar.'
  if (room.code && !room.phase) text = 'Conectando…'
  else if (room.phase === 'WAITING') text = 'Você entrou na sala. O robô chega em instantes.'
  else if (room.phase === 'MATCHED') text = 'Match feito! A Preparação começa em 3 segundos.'
  else if (room.phase === 'DRAFT') {
    text = draft.ready[me]
      ? 'Pronto! Esperando o robô terminar de escolher…'
      : 'Escolha seu personagem e 2 habilidades e toque em Confirmar. Sem escolha em 20s, o jogo escolhe por você.'
  } else if (room.phase === 'VERSUS') text = 'Confronto! O primeiro round começa em instantes.'
  else if (room.phase === 'ROUND_DRAW') {
    text = drawOptions
      ? 'Sorteio: escolha 1 das 3 cartas logo abaixo da tela (8 segundos).'
      : 'Esperando o robô escolher a carta dele…'
  } else if (room.phase === 'PLAYING') {
    text =
      turn?.player === me
        ? 'Sua vez: toque numa casa vazia do tabuleiro.'
        : 'Vez do robô. Espere a jogada dele.'
  } else if (room.phase === 'ROUND_END') text = 'Fim do round! O próximo começa em instantes.'
  else if (room.phase === 'RESULT') {
    if (rematch) {
      text =
        rematch.requestedBy === me
          ? 'Revanche pedida. Esperando o robô responder (até 15 segundos)…'
          : 'O robô pediu revanche: aceite ou recuse em até 15 segundos.'
    } else if (rematchCancelled || room.closedReason !== null) {
      text = 'A sala foi encerrada. Toque em Voltar ao Lobby ou escolha outro cenário.'
    } else text = 'Fim de jogo. Peça revanche ou volte ao Lobby.'
  }

  // Quedas (FE-20) têm prioridade sobre o passo da fase
  if (room.connection === 'RECONNECTING') {
    text = 'Sua conexão caiu. Reconectando… (o seu tempo de turno continua correndo)'
  } else if (opponent.disconnected && room.phase !== 'RESULT') {
    text = `O robô caiu: os turnos dele estouram sozinhos (${opponent.consecutiveTimeouts}/3). No 3º seguido, ele perde por W.O.`
  }

  return (
    <p
      role="status"
      className="rounded-xl border-2 border-primary/60 bg-primary/10 px-3 py-2 font-display text-lg font-bold"
    >
      <span className="text-text-muted">Agora: </span>
      {text}
    </p>
  )
}

/** A "tela do celular deitado": mostra a fase atual do começo ao fim */
function PhoneFrame({ onPlayAgain, onLeave }: { onPlayAgain: () => void; onLeave: () => void }) {
  const phase = useRoomStore((s) => s.phase)
  const code = useRoomStore((s) => s.code)

  let screen = <Centered text="Nenhuma partida em andamento." />
  if (code && (phase === null || phase === 'WAITING')) {
    screen = <Centered text="Sala 0000 · Aguardando adversário…" />
  } else if (phase === 'MATCHED') screen = <Centered text="MATCH FEITO! O robô entrou!" />
  else if (phase === 'DRAFT') screen = <DraftScreen />
  else if (phase && ARENA_PHASES.includes(phase)) screen = <Arena onQuit={onLeave} />
  else if (phase === 'RESULT') {
    // A mesma tela da sala (FE-15), num pai com altura definida
    screen = (
      <div className="flex h-full flex-col">
        <ResultScreen onLeave={onLeave} />
      </div>
    )
  }

  return (
    <>
      <div className="h-[390px] w-[844px] max-w-full overflow-hidden rounded-[28px] border-4 border-line bg-bg-deep px-4 py-2">
        {screen}
      </div>
      {phase === 'RESULT' && (
        <Button variant="ghost" size="sm" className="self-start" onClick={onPlayAgain}>
          Jogar de novo (mesmo cenário)
        </Button>
      )}
    </>
  )
}

function Centered({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center text-center font-display text-2xl font-bold text-text-muted uppercase">
      {text}
    </div>
  )
}

/** Preparação simplificada (a tela de verdade é a FE-09) */
function DraftScreen() {
  const draft = useDraftStore()
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const opp = otherSlot(me)
  const [picked, setPicked] = useState<AbilityId[]>([])

  const toggle = (ability: AbilityId) =>
    setPicked((prev) =>
      prev.includes(ability) ? prev.filter((a) => a !== ability) : [...prev, ability].slice(-2),
    )

  return (
    <div className="flex h-full flex-col justify-center gap-3 overflow-y-auto">
      <p className="text-sm">
        <b>Personagem</b> · robô: {draft.ready[opp] ? 'pronto' : 'escolhendo…'}
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
      <p className="text-sm">
        <b>2 habilidades iniciais</b> ({picked.length}/2)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ABILITIES.map((a) => (
          <Button
            key={a}
            size="sm"
            variant={picked.includes(a) ? 'primary' : 'ghost'}
            onClick={() => toggle(a)}
          >
            {ABILITY_INFO[a].name}
          </Button>
        ))}
      </div>
      <Button
        className="self-start"
        disabled={picked.length !== 2 || draft.ready[me]}
        onClick={() =>
          sendCommand({ type: 'DRAFT_ABILITIES', payload: { abilities: [picked[0], picked[1]] } })
        }
      >
        {draft.ready[me] ? 'Pronto' : 'Confirmar'}
      </Button>
    </div>
  )
}

/** Quedas de conexão sob demanda (FE-20). O aviso do oponente na Arena é da FE-05. */
function DropControls() {
  const { disconnected } = useOpponentDisconnect()
  const reconnecting = useRoomStore((s) => s.connection === 'RECONNECTING')
  const controls = () => getMockControls()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-text-muted">Simular queda:</span>
      <Button
        size="sm"
        variant="secondary"
        disabled={reconnecting}
        onClick={() => controls()?.simulateDrop(5000)}
      >
        Minha conexão cai (5s)
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          disconnected ? controls()?.reconnectOpponent() : controls()?.dropOpponent()
        }
      >
        {disconnected ? 'Robô volta' : 'Robô cai'}
      </Button>
    </div>
  )
}

/** Cartas do sorteio da 3ª habilidade (a tela de verdade é a FE-10) */
function DrawPicker() {
  const drawOptions = usePowersStore((s) => s.drawOptions)
  if (!drawOptions) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display font-bold uppercase">Escolha 1 carta:</span>
      {drawOptions.options.map((a) => (
        <Button
          key={a}
          variant="secondary"
          onClick={() => sendCommand({ type: 'DRAW_PICK', payload: { ability: a } })}
        >
          {ABILITY_INFO[a].name}
        </Button>
      ))}
    </div>
  )
}

/** Tabuleiro de teste com mira de habilidade, só para quem quer testar o servidor */
function AbilityTester() {
  const room = useRoomStore()
  const board = useBoardStore()
  const powers = usePowersStore()
  const lastAbility = board.lastAbility
  const turn = useTimerStore((s) => s.turn)
  const me: PlayerSlot = room.mySlot ?? 'P1'
  const opp = otherSlot(me)
  const myTurn = room.phase === 'PLAYING' && turn?.player === me
  const aim = powers.aim
  const aimInfo = aim ? ABILITY_INFO[aim.ability] : null
  const characterOf = (slot: PlayerSlot) => room.players.find((p) => p.slot === slot)?.character
  const characters = { P1: characterOf('P1'), P2: characterOf('P2') }

  const owners = board.cells.map((c) => c.owner)
  const where = (fn: (owner: PlayerSlot | null) => boolean) =>
    owners.flatMap((o, i) => (fn(o) ? [i] : []))

  let selectable = where((o) => o === null)
  if (aim && aimInfo) {
    if (aimInfo.needsDestination && aim.selectedCell !== null) {
      selectable = adjacentCells(aim.selectedCell).filter((i) => owners[i] === null)
    } else if (aimInfo.target === 'OPPONENT_PIECE') selectable = where((o) => o === opp)
    else if (aimInfo.target === 'OWN_PIECE') selectable = where((o) => o === me)
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

  const trigger = (ability: AbilityId) => {
    if (ABILITY_INFO[ability].target === 'NONE') {
      sendCommand({ type: 'USE_ABILITY', payload: { ability } })
    } else powers.startAim(ability)
  }

  if (room.phase !== 'PLAYING') {
    return <p className="text-sm text-text-muted">Disponível durante a partida.</p>
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="h-[260px] w-full max-w-[360px]">
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
        <div className="flex flex-wrap gap-2">
          {powers.deck.map((slot) => (
            <Button
              key={slot.ability}
              size="sm"
              variant={aim?.ability === slot.ability ? 'primary' : 'secondary'}
              disabled={!myTurn || slot.usedThisRound}
              onClick={() => trigger(slot.ability)}
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
        {aim && aimInfo && (
          <p className="text-sm">
            Mirando {aimInfo.name}:{' '}
            {aimInfo.needsDestination && aim.selectedCell !== null
              ? 'toque na casa vizinha de destino.'
              : 'toque no alvo destacado.'}
          </p>
        )}
        {lastAbility && (
          <p className="text-sm text-text-muted">
            Última: {lastAbility.by === me ? 'você' : 'o robô'} usou{' '}
            {ABILITY_INFO[lastAbility.ability].name}
            {lastAbility.absorbed && ' (anulada pelo Campo de Força)'}
            {lastAbility.noEffect && ' (sem efeito)'}
          </p>
        )}
      </div>
    </div>
  )
}
