// Ponto único de entrada dos eventos do servidor (ARCHITECTURE §3). O cliente STOMP (FE-18) e o
// servidor simulado (FE-35) chamam applyServerEvent; nenhum componente assina eventos direto.
// Cada store reflete o que o servidor confirmou: nada aqui calcula placar, vencedor ou timeout.
import type { CharacterId, PlayerSlot, PlayerState, RoomPhase, TurnActions } from '../types/game'
import { otherSlot } from '../lib/match'
import type { RoomClosedReason, ServerEnvelope, ServerEvent } from '../types/events'
import { initialBoardState, useBoardStore } from './boardStore'
import { useClockStore } from './clockStore'
import { INITIAL_DRAFT_STATE, useDraftStore } from './draftStore'
import { INITIAL_MATCH_STATE, type RematchCancelReason, useMatchStore } from './matchStore'
import { INITIAL_POWERS_DATA, usePowersStore } from './powersStore'
import { INITIAL_ROOM_STATE, type RoomGameState, useRoomStore } from './roomStore'
import { INITIAL_TIMER_STATE, NO_TURN_ACTIONS, useTimerStore } from './timerStore'
import { playSoundForServerEvent } from '../features/sound'
import { playAnnouncementForServerEvent } from '../features/vitao/vitaoVoices'

const patchPlayer = (players: PlayerState[], slot: PlayerSlot, patch: Partial<PlayerState>) =>
  players.map((p) => (p.slot === slot ? { ...p, ...patch } : p))

/** Sala encerrada com um pedido de revanche em aberto: o motivo do cancelamento [RN-POS-02] */
const REMATCH_CANCEL_REASON: Partial<Record<RoomClosedReason, RematchCancelReason>> = {
  REMATCH_DECLINED: 'DECLINED',
  REMATCH_EXPIRED: 'TIMEOUT',
  RETURN_TO_LOBBY: 'LEFT',
  REMATCH_DISCONNECTED: 'LEFT',
  PLAYER_LEFT: 'LEFT',
}

/** Sala de Espera e Match feito: a sala não volta para elas depois da Preparação */
const isLobbyPhase = (phase: RoomPhase) => phase === 'WAITING' || phase === 'MATCHED'

/**
 * A partida que fica para trás quando a sala vai para `next`: sair do Resultado para a Preparação
 * é a revanche aceita. Fora disso, continua a que já estava guardada
 */
function leftGameAfter(room: RoomGameState, next: RoomPhase): string | null {
  return room.phase === 'RESULT' && next === 'DRAFT' ? room.gameId : room.leftGameId
}

/** Versão do estado da partida que o evento traz (só os eventos de jogo têm), BE-046 */
function stateVersionOf(event: ServerEvent): number | null {
  switch (event.type) {
    case 'TURN_START':
    case 'BOARD_UPDATE':
    case 'ABILITY_RESOLVED':
    case 'TURN_TIMEOUT':
      return event.payload.stateVersion ?? null
    default:
      return null
  }
}

/** O turno já foi fechado pelo servidor: nada mais fica liberado até o próximo TURN_START */
const TURN_CLOSED: TurnActions = { abilityUsed: true, moveUsed: true }

/**
 * O que o jogador da vez já fez, como veio com a jogada ou a habilidade. Zerado depois de uma ação
 * já feita quer dizer que o servidor fechou o turno (as duas ações usadas): o TURN_START do próximo
 * vem logo atrás e, até ele, o turno fica travado
 */
function applyTurnActions(actions: TurnActions | undefined) {
  if (!actions) return
  const current = useTimerStore.getState().actions
  const closed =
    !actions.abilityUsed && !actions.moveUsed && (current.abilityUsed || current.moveUsed)
  useTimerStore.setState({ actions: closed ? TURN_CLOSED : actions })
}

/** Limpa o estado da partida (Preparação, placar, tabuleiro, habilidades, turno) */
function resetMatchStores() {
  useDraftStore.setState(INITIAL_DRAFT_STATE, true)
  useMatchStore.setState(INITIAL_MATCH_STATE, true)
  useBoardStore.setState(initialBoardState(), true)
  usePowersStore.setState(INITIAL_POWERS_DATA)
  useTimerStore.setState(INITIAL_TIMER_STATE, true)
}

/** Ao sair da sala: limpa tudo, menos o link direto pendente e a conexão */
export function resetGameStores() {
  resetMatchStores()
  useRoomStore.setState(INITIAL_ROOM_STATE)
  useClockStore.getState().reset()
}

export function applyServerEvent(envelope: ServerEnvelope, receivedAt = Date.now()) {
  const { serverTime } = envelope
  if (!envelope.local) useClockStore.getState().syncWithServer(serverTime, receivedAt)

  const event = { type: envelope.type, payload: envelope.payload } as ServerEvent
  // Jogada e habilidade do mesmo turno chegam em sequência e podem se cruzar no caminho: o evento
  // de um estado mais antigo que o último aplicado é descartado, antes de tocar som (BE-046)
  const version = stateVersionOf(event)
  const appliedVersion = useTimerStore.getState().stateVersion
  if (version !== null && appliedVersion !== null && version < appliedVersion) return
  if (version !== null) useTimerStore.setState({ stateVersion: version })
  playSoundForServerEvent(event)
  // Anúncios gravados (Confronto, Round 1 e 2, empates, estouro do oponente): só a voz (FE-48)
  playAnnouncementForServerEvent(event)

  switch (event.type) {
    case 'ROOM_SNAPSHOT': {
      // Estado completo, ao entrar e ao reconectar: substitui tudo
      const s = event.payload
      const room = useRoomStore.getState()
      const sameRoom = room.code === s.code
      // Mais antigo que o último aplicado: chegou fora de ordem
      if (sameRoom && s.serverTime < room.snapshotTime) return
      // Resultado da partida que a revanche já deixou para trás (FRT-01): o back mandava o
      // Resultado antigo entre o fim da Preparação da revanche e a partida nova
      if (sameRoom && s.gameId != null && s.gameId === room.leftGameId) return
      // A sala nunca volta para a Sala de Espera nem para o Match feito depois da Preparação:
      // um snapshot assim foi montado antes e chegou atrasado (AMB-03)
      if (sameRoom && isLobbyPhase(s.phase) && room.phase !== null && !isLobbyPhase(room.phase))
        return
      // Da mesma partida, montado antes do último evento de jogo aplicado (BE-046)
      const sameGame = sameRoom && s.gameId != null && s.gameId === room.gameId
      const appliedState = useTimerStore.getState().stateVersion
      const snapshotState = s.turn?.stateVersion ?? null
      if (
        sameGame &&
        snapshotState !== null &&
        appliedState !== null &&
        snapshotState < appliedState
      )
        return
      const previous = useMatchStore.getState()
      const previousWinningLine = useBoardStore.getState().winningLine
      const draftVersion = useDraftStore.getState().version
      // O back manda um snapshot logo depois do MATCH_END (e a cada pedido de revanche). Ele não
      // pode apagar o que a tela ainda mostra do fim da partida: a hora do resultado segura o
      // banner do W.O. e toca a comemoração; o fim do round mostra o EMPATE ABSOLUTO
      const keepResult = sameRoom && previous.outcome !== null && s.outcome !== null
      const of = (slot: PlayerSlot) => s.players.find((p) => p.slot === slot)
      const characters: Partial<Record<PlayerSlot, CharacterId>> = {}
      for (const p of s.players) if (p.character) characters[p.slot] = p.character
      // Cada store é trocada de uma vez, sem passar pelo estado zerado: quem observa a store (o
      // avanço da Preparação, o saldo depois da partida, o Vitão) só vê o antes e o depois.
      // Antes, cada snapshot da Preparação parecia uma confirmação nova do personagem (FRT-04)
      useRoomStore.setState({
        code: s.code,
        phase: s.phase,
        players: s.players,
        mySlot: s.mySlot,
        closedReason: null,
        snapshotTime: s.serverTime,
        gameId: s.gameId ?? null,
        leftGameId: sameRoom ? leftGameAfter(room, s.phase) : null,
      })
      useMatchStore.setState(
        {
          ...INITIAL_MATCH_STATE,
          round: s.round,
          suddenDeath: s.suddenDeath,
          score: { P1: of('P1')?.roundsWon ?? 0, P2: of('P2')?.roundsWon ?? 0 },
          consecutiveTimeouts: {
            P1: of('P1')?.consecutiveTimeouts ?? 0,
            P2: of('P2')?.consecutiveTimeouts ?? 0,
          },
          outcome: s.outcome,
          coins: s.coins ?? null,
          rematch: s.rematch ? { requestedBy: s.rematch.by, deadline: s.rematch.deadline } : null,
          ...(keepResult && {
            outcomeReceivedAt: previous.outcomeReceivedAt,
            roundEnd: previous.roundEnd,
            lastTimeout: previous.lastTimeout,
          }),
        },
        true,
      )
      useDraftStore.setState(
        s.draft
          ? {
              deadline: s.draft.deadline,
              ready: s.draft.ready,
              characters,
              // O snapshot não traz a versão: na mesma Preparação, continua valendo a última aplicada
              version: sameRoom && s.phase === 'DRAFT' ? draftVersion : null,
            }
          : INITIAL_DRAFT_STATE,
        true,
      )
      useBoardStore.setState(
        {
          ...initialBoardState(),
          cells: s.board,
          ...(keepResult && { winningLine: previousWinningLine }),
        },
        true,
      )
      usePowersStore.setState({
        ...INITIAL_POWERS_DATA,
        deck: s.myDeck,
        drawOptions: s.drawOptions ?? null,
      })
      const { turn } = s
      useTimerStore.setState(
        {
          turn: turn
            ? {
                player: turn.player,
                startedAt: turn.startedAt,
                durationSeconds: turn.durationSeconds,
              }
            : null,
          // Quem volta no meio do turno continua de onde parou: jogou, usou a habilidade ou nada
          actions: turn?.actions ?? NO_TURN_ACTIONS,
          stateVersion: snapshotState ?? (sameGame ? appliedState : null),
        },
        true,
      )
      return
    }

    case 'PLAYER_JOINED':
      useRoomStore.setState((r) => ({
        players: [
          ...r.players.filter((p) => p.slot !== event.payload.player.slot),
          event.payload.player,
        ],
      }))
      return

    case 'PLAYER_LEFT':
      useRoomStore.setState((r) => ({
        players: r.players.filter((p) => p.slot !== event.payload.slot),
      }))
      return

    case 'PLAYER_DISCONNECTED':
    case 'PLAYER_RECONNECTED': {
      const connected = event.type === 'PLAYER_RECONNECTED'
      useRoomStore.setState((r) => ({
        players: patchPlayer(r.players, event.payload.slot, { connected }),
      }))
      return
    }

    case 'PHASE_CHANGE': {
      const room = useRoomStore.getState()
      // Revanche aceita: tudo recomeça do zero na Preparação [RN-POS-03], e a partida que acabou
      // fica para trás
      if (event.payload.phase === 'DRAFT') {
        resetMatchStores()
        useRoomStore.setState({ leftGameId: leftGameAfter(room, 'DRAFT') })
      }
      // Fim do sorteio: começa a apresentação do round, antes do primeiro turno
      if (event.payload.phase === 'PLAYING') useMatchStore.setState({ introStartedAt: receivedAt })
      // As cartas do sorteio valem só nele. Do round 2 em diante, o tempo esgotado não manda
      // DECK_UPDATE (o deck fica como está), então nada mais as tiraria
      if (event.payload.phase !== 'ROUND_DRAW') usePowersStore.setState({ drawOptions: null })
      useRoomStore.setState({ phase: event.payload.phase })
      return
    }

    case 'DRAFT_UPDATE': {
      const { deadline, characters, ready, version = null } = event.payload
      // Os dois escolhendo juntos: um aviso mais antigo pode chegar depois do mais novo
      const applied = useDraftStore.getState().version
      if (version !== null && applied !== null && version < applied) return
      useDraftStore.setState({ deadline, characters, ready, version })
      useRoomStore.setState((r) => ({
        players: r.players.map((p) => ({ ...p, character: characters[p.slot] ?? p.character })),
      }))
      return
    }

    case 'DRAW_OPTIONS':
      usePowersStore.setState({ drawOptions: event.payload })
      return

    case 'ROUND_START': {
      const { round, startingPlayer, suddenDeath } = event.payload
      // Os estouros NÃO zeram aqui: persistem entre rounds [RN-ARN-01]
      useMatchStore.setState({
        round,
        startingPlayer,
        suddenDeath,
        roundEnd: null,
        roundStartedAt: receivedAt,
        introStartedAt: null, // a apresentação vem depois do sorteio
      })
      useBoardStore.setState({ winningLine: null, lastAbility: null })
      usePowersStore.setState({ aim: null })
      // O Silêncio não passa de um round para o outro
      useRoomStore.setState((r) => ({
        players: r.players.map((p) => ({ ...p, silenced: false })),
      }))
      return
    }

    case 'DECK_UPDATE':
      usePowersStore.setState({ deck: event.payload.deck, drawOptions: null, aim: null })
      return

    case 'TURN_START': {
      const { consecutiveTimeouts, silenced, player, startedAt, durationSeconds, actions } =
        event.payload
      // Turno novo: nada feito ainda (o back manda os dois em false)
      useTimerStore.setState({
        turn: { player, startedAt, durationSeconds },
        actions: actions ?? NO_TURN_ACTIONS,
      })
      useMatchStore.setState({ consecutiveTimeouts })
      useRoomStore.setState((r) => ({
        players: r.players.map((p) => ({
          ...p,
          consecutiveTimeouts: consecutiveTimeouts[p.slot],
          // Valor oficial do back. Sem ele (simulado): o Silêncio vale só para o turno de quem foi
          // silenciado e acaba quando começa o do outro
          silenced: silenced ? silenced[p.slot] : p.slot === player && p.silenced,
        })),
      }))
      usePowersStore.setState({ aim: null })
      return
    }

    case 'BOARD_UPDATE':
      useBoardStore.setState({ cells: event.payload.board })
      applyTurnActions(event.payload.actions)
      return

    case 'ABILITY_RESOLVED': {
      const { actions: _actions, stateVersion: _version, ...resolved } = event.payload
      useBoardStore.setState({ lastAbility: { ...resolved, serverTime, receivedAt } })
      applyTurnActions(event.payload.actions)
      // Silêncio confirmado (não anulado pelo Campo de Força) cala o oponente no próximo turno dele.
      // O back confirma no TURN_START seguinte (`silenced`); o simulado depende só daqui
      if (event.payload.ability === 'SILENCIO' && !event.payload.absorbed) {
        useRoomStore.setState((r) => ({
          players: patchPlayer(r.players, otherSlot(event.payload.by), { silenced: true }),
        }))
      }
      usePowersStore.setState({ aim: null })
      return
    }

    case 'TURN_TIMEOUT': {
      const { player, consecutiveTimeouts } = event.payload
      useMatchStore.setState((m) => ({
        consecutiveTimeouts: { ...m.consecutiveTimeouts, [player]: consecutiveTimeouts },
        lastTimeout: { player, consecutiveTimeouts, serverTime, receivedAt },
      }))
      useRoomStore.setState((r) => ({
        players: patchPlayer(r.players, player, { consecutiveTimeouts }),
      }))
      usePowersStore.setState({ aim: null })
      return
    }

    case 'ROUND_END': {
      const { round, winner, winningLine, score } = event.payload
      useMatchStore.setState({ score, roundEnd: { round, winner, winningLine } })
      useBoardStore.setState({ winningLine })
      useTimerStore.setState({ turn: null, actions: NO_TURN_ACTIONS })
      usePowersStore.setState({ aim: null })
      useRoomStore.setState((r) => ({
        players: r.players.map((p) => ({ ...p, roundsWon: score[p.slot] })),
      }))
      return
    }

    case 'MATCH_END':
      useMatchStore.setState((m) => ({
        outcome: event.payload.outcome,
        // Repetido (ex: reenviado numa reconexão) mantém a hora do primeiro: a Arena não volta a
        // segurar o banner e o Resultado não toca a comemoração de novo. Se a partida veio de um
        // snapshot (já tinha resultado, sem hora), continua sem hora
        outcomeReceivedAt: m.outcome === null ? receivedAt : m.outcomeReceivedAt,
        coins: event.payload.coins,
      }))
      useTimerStore.setState({ turn: null, actions: NO_TURN_ACTIONS })
      usePowersStore.setState({ aim: null })
      return

    case 'REMATCH_REQUESTED':
      useMatchStore.setState({
        rematch: { requestedBy: event.payload.by, deadline: event.payload.deadline },
        rematchCancelled: null,
      })
      return

    case 'REMATCH_CANCELLED':
      useMatchStore.setState((m) => ({
        rematch: null,
        rematchCancelled: {
          reason: event.payload.reason,
          requestedBy: m.rematch?.requestedBy ?? null,
        },
      }))
      return

    case 'ROOM_CLOSED': {
      const { reason } = event.payload
      // O back não tem evento de revanche cancelada: a sala encerrada é que cancela o pedido
      const pending = useMatchStore.getState().rematch
      const cancel = REMATCH_CANCEL_REASON[reason]
      if (pending && cancel) {
        useMatchStore.setState({
          rematch: null,
          rematchCancelled: { reason: cancel, requestedBy: pending.requestedBy },
        })
      }
      useRoomStore.setState({ closedReason: reason })
      return
    }

    case 'ERROR':
      useRoomStore.setState({ lastError: { ...event.payload, serverTime } })
      return
  }
}
