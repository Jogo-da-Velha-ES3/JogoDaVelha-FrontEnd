// Ponto único de entrada dos eventos do servidor (ARCHITECTURE §3). O cliente STOMP (FE-18) e o
// servidor simulado (FE-35) chamam applyServerEvent; nenhum componente assina eventos direto.
// Cada store reflete o que o servidor confirmou: nada aqui calcula placar, vencedor ou timeout.
import type { PlayerSlot, PlayerState } from '../types/game'
import type { ServerEnvelope, ServerEvent } from '../types/events'
import { initialBoardState, useBoardStore } from './boardStore'
import { useClockStore } from './clockStore'
import { INITIAL_DRAFT_STATE, useDraftStore } from './draftStore'
import { INITIAL_MATCH_STATE, useMatchStore } from './matchStore'
import { INITIAL_POWERS_DATA, usePowersStore } from './powersStore'
import { INITIAL_ROOM_STATE, useRoomStore } from './roomStore'
import { INITIAL_TIMER_STATE, useTimerStore } from './timerStore'

const patchPlayer = (players: PlayerState[], slot: PlayerSlot, patch: Partial<PlayerState>) =>
  players.map((p) => (p.slot === slot ? { ...p, ...patch } : p))

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

  switch (event.type) {
    case 'ROOM_SNAPSHOT': {
      // Estado completo, ao entrar e ao reconectar: substitui tudo
      const s = event.payload
      const of = (slot: PlayerSlot) => s.players.find((p) => p.slot === slot)
      resetMatchStores()
      useRoomStore.setState({
        code: s.code,
        phase: s.phase,
        players: s.players,
        mySlot: s.mySlot,
        reconnectDeadlines: {},
        closedReason: null,
      })
      useMatchStore.setState({
        round: s.round,
        suddenDeath: s.suddenDeath,
        score: { P1: of('P1')?.roundsWon ?? 0, P2: of('P2')?.roundsWon ?? 0 },
        consecutiveTimeouts: {
          P1: of('P1')?.consecutiveTimeouts ?? 0,
          P2: of('P2')?.consecutiveTimeouts ?? 0,
        },
        outcome: s.outcome,
      })
      useBoardStore.setState({ cells: s.board })
      usePowersStore.setState({ deck: s.myDeck })
      useTimerStore.setState({ turn: s.turn })
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

    case 'PLAYER_DISCONNECTED': {
      const { slot, reconnectDeadline } = event.payload
      useRoomStore.setState((r) => ({
        players: patchPlayer(r.players, slot, { connected: false }),
        reconnectDeadlines: { ...r.reconnectDeadlines, [slot]: reconnectDeadline },
      }))
      return
    }

    case 'PLAYER_RECONNECTED': {
      const { slot } = event.payload
      useRoomStore.setState((r) => {
        const reconnectDeadlines = { ...r.reconnectDeadlines }
        delete reconnectDeadlines[slot]
        return { players: patchPlayer(r.players, slot, { connected: true }), reconnectDeadlines }
      })
      return
    }

    case 'PHASE_CHANGE':
      // Revanche aceita: tudo recomeça do zero na Preparação [RN-POS-03]
      if (event.payload.phase === 'DRAFT') resetMatchStores()
      useRoomStore.setState({ phase: event.payload.phase })
      return

    case 'DRAFT_UPDATE': {
      const { deadline, characters, ready } = event.payload
      useDraftStore.setState({ deadline, characters, ready })
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
      useMatchStore.setState({ round, startingPlayer, suddenDeath, roundEnd: null })
      useBoardStore.setState({ winningLine: null, lastAbility: null })
      usePowersStore.setState({ aim: null })
      return
    }

    case 'DECK_UPDATE':
      usePowersStore.setState({ deck: event.payload.deck, drawOptions: null, aim: null })
      return

    case 'TURN_START': {
      const { consecutiveTimeouts, ...turn } = event.payload
      useTimerStore.setState({ turn })
      useMatchStore.setState({ consecutiveTimeouts })
      useRoomStore.setState((r) => ({
        players: r.players.map((p) => ({
          ...p,
          consecutiveTimeouts: consecutiveTimeouts[p.slot],
        })),
      }))
      usePowersStore.setState({ aim: null })
      return
    }

    case 'BOARD_UPDATE':
      useBoardStore.setState({ cells: event.payload.board })
      return

    case 'ABILITY_RESOLVED':
      useBoardStore.setState({ lastAbility: { ...event.payload, serverTime } })
      usePowersStore.setState({ aim: null })
      return

    case 'TURN_TIMEOUT': {
      const { player, consecutiveTimeouts } = event.payload
      useMatchStore.setState((m) => ({
        consecutiveTimeouts: { ...m.consecutiveTimeouts, [player]: consecutiveTimeouts },
        lastTimeout: { player, consecutiveTimeouts, serverTime },
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
      useTimerStore.setState({ turn: null })
      usePowersStore.setState({ aim: null })
      useRoomStore.setState((r) => ({
        players: r.players.map((p) => ({ ...p, roundsWon: score[p.slot] })),
      }))
      return
    }

    case 'MATCH_END':
      useMatchStore.setState({
        outcome: event.payload.outcome,
        outcomeReceivedAt: receivedAt,
        coins: event.payload.coins,
      })
      useTimerStore.setState({ turn: null })
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

    case 'ROOM_CLOSED':
      useRoomStore.setState({ closedReason: event.payload.reason })
      return

    case 'ERROR':
      useRoomStore.setState({ lastError: { ...event.payload, serverTime } })
      return
  }
}
