import { beforeEach, describe, expect, it } from 'vitest'
import type { Cell, DeckSlot, PlayerSlot, PlayerState, RoomSnapshot } from '../types/game'
import type { ServerEvent } from '../types/events'
import { useBoardStore } from './boardStore'
import { useClockStore } from './clockStore'
import { useDraftStore } from './draftStore'
import { useMatchStore } from './matchStore'
import { usePowersStore } from './powersStore'
import { useRoomStore } from './roomStore'
import { applyServerEvent, resetGameStores } from './serverEvents'
import { useTimerStore } from './timerStore'

let clock = 1_000_000

/** Manda um evento como se viesse do servidor, avançando o relógio */
function send<T extends ServerEvent['type']>(
  type: T,
  payload: Extract<ServerEvent, { type: T }>['payload'],
) {
  clock += 1000
  applyServerEvent({ type, payload, serverTime: clock } as never, clock)
}

const player = (slot: PlayerSlot, patch: Partial<PlayerState> = {}): PlayerState => ({
  slot,
  userId: `u-${slot}`,
  nickname: slot === 'P1' ? 'Rafa' : 'Vini',
  character: null,
  roundsWon: 0,
  consecutiveTimeouts: 0,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
  ...patch,
})

const cells = (owners: string): Cell[] =>
  owners.split('').map((c, index) => ({
    index,
    owner: c === 'X' ? 'P1' : c === 'O' ? 'P2' : null,
    effects: [],
  }))

const turn = (p: PlayerSlot, timeouts = { P1: 0, P2: 0 }, durationSeconds = 10) => ({
  player: p,
  startedAt: clock,
  durationSeconds,
  consecutiveTimeouts: timeouts,
})

const match = () => useMatchStore.getState()

beforeEach(() => {
  resetGameStores()
  useRoomStore.setState({ pendingRoomCode: null })
  send('PLAYER_JOINED', { player: player('P1') })
  send('PLAYER_JOINED', { player: player('P2') })
})

describe('partida completa', () => {
  it('2×1 com Morte Súbita: placar só vem do ROUND_END', () => {
    send('ROUND_START', { round: 1, startingPlayer: 'P2', suddenDeath: false })
    expect(match()).toMatchObject({ round: 1, startingPlayer: 'P2', suddenDeath: false })

    send('ROUND_END', {
      round: 1,
      winner: 'P1',
      winningLine: [0, 1, 2, 3],
      score: { P1: 1, P2: 0 },
    })
    expect(match().score).toEqual({ P1: 1, P2: 0 })
    expect(useBoardStore.getState().winningLine).toEqual([0, 1, 2, 3])

    send('ROUND_START', { round: 2, startingPlayer: 'P1', suddenDeath: false })
    expect(useBoardStore.getState().winningLine).toBeNull()
    send('ROUND_END', {
      round: 2,
      winner: 'P2',
      winningLine: [0, 4, 8, 12],
      score: { P1: 1, P2: 1 },
    })

    send('ROUND_START', { round: 3, startingPlayer: 'P2', suddenDeath: true })
    send('TURN_START', turn('P2', { P1: 0, P2: 0 }, 5))
    expect(match().suddenDeath).toBe(true)
    expect(useTimerStore.getState().turn?.durationSeconds).toBe(5)

    send('ROUND_END', {
      round: 3,
      winner: 'P2',
      winningLine: [3, 6, 9, 12],
      score: { P1: 1, P2: 2 },
    })
    send('MATCH_END', {
      outcome: { kind: 'WIN', winner: 'P2', score: [1, 2] },
      coins: { P1: 10, P2: 50 },
    })
    expect(match().score).toEqual({ P1: 1, P2: 2 })
    expect(match().outcome).toEqual({ kind: 'WIN', winner: 'P2', score: [1, 2] })
    expect(match().coins).toEqual({ P1: 10, P2: 50 })
    expect(useTimerStore.getState().turn).toBeNull()
  })

  it('o front não calcula o placar: mostra exatamente o que o servidor mandou', () => {
    send('ROUND_START', { round: 1, startingPlayer: 'P1', suddenDeath: false })
    // Um placar "estranho" de propósito: se o front somasse vitórias, daria 1×0
    send('ROUND_END', { round: 1, winner: 'P1', winningLine: null, score: { P1: 0, P2: 1 } })
    expect(match().score).toEqual({ P1: 0, P2: 1 })
    expect(useRoomStore.getState().players.map((p) => p.roundsWon)).toEqual([0, 1])
  })

  it('1×0 depois de um empate (sem round 3)', () => {
    send('ROUND_START', { round: 1, startingPlayer: 'P1', suddenDeath: false })
    send('ROUND_END', { round: 1, winner: null, winningLine: null, score: { P1: 0, P2: 0 } })
    expect(match().roundEnd).toEqual({ round: 1, winner: null, winningLine: null })

    send('ROUND_START', { round: 2, startingPlayer: 'P2', suddenDeath: false })
    send('ROUND_END', {
      round: 2,
      winner: 'P1',
      winningLine: [0, 5, 10, 15],
      score: { P1: 1, P2: 0 },
    })
    send('MATCH_END', {
      outcome: { kind: 'WIN', winner: 'P1', score: [1, 0] },
      coins: { P1: 50, P2: 10 },
    })
    expect(match().round).toBe(2)
    expect(match().outcome).toMatchObject({ kind: 'WIN', score: [1, 0] })
  })

  it('empate absoluto é representado [RN-ARN-06]', () => {
    send('ROUND_START', { round: 3, startingPlayer: 'P1', suddenDeath: true })
    send('ROUND_END', { round: 3, winner: null, winningLine: null, score: { P1: 1, P2: 1 } })
    send('MATCH_END', { outcome: { kind: 'ABSOLUTE_DRAW' }, coins: { P1: 20, P2: 20 } })
    expect(match().outcome).toEqual({ kind: 'ABSOLUTE_DRAW' })
    expect(match().coins).toEqual({ P1: 20, P2: 20 })
  })

  it('W.O.: estouros 1/3, 2/3 e o fim por W.O. [RN-ARN-01]', () => {
    send('ROUND_START', { round: 1, startingPlayer: 'P1', suddenDeath: false })
    for (const n of [1, 2, 3]) {
      send('TURN_TIMEOUT', { player: 'P1', consecutiveTimeouts: n })
      expect(match().lastTimeout).toMatchObject({ player: 'P1', consecutiveTimeouts: n })
    }
    send('MATCH_END', { outcome: { kind: 'WO', winner: 'P2' }, coins: { P1: 0, P2: 30 } })
    expect(match().consecutiveTimeouts).toEqual({ P1: 3, P2: 0 })
    expect(match().outcome).toEqual({ kind: 'WO', winner: 'P2' })
  })
})

describe('estouros seguidos', () => {
  it('não zeram na troca de round', () => {
    send('ROUND_START', { round: 1, startingPlayer: 'P1', suddenDeath: false })
    send('TURN_TIMEOUT', { player: 'P2', consecutiveTimeouts: 2 })
    send('ROUND_END', { round: 1, winner: 'P1', winningLine: null, score: { P1: 1, P2: 0 } })
    send('ROUND_START', { round: 2, startingPlayer: 'P2', suddenDeath: false })
    expect(match().consecutiveTimeouts).toEqual({ P1: 0, P2: 2 })
  })

  it('o valor oficial chega no TURN_START (inclusive quando zera)', () => {
    send('TURN_TIMEOUT', { player: 'P2', consecutiveTimeouts: 2 })
    send('TURN_START', turn('P2', { P1: 0, P2: 0 }))
    expect(match().consecutiveTimeouts).toEqual({ P1: 0, P2: 0 })
    expect(useRoomStore.getState().players.find((p) => p.slot === 'P2')?.consecutiveTimeouts).toBe(
      0,
    )
  })
})

describe('reconexão', () => {
  it('ROOM_SNAPSHOT monta tudo de uma vez', () => {
    const deck: DeckSlot[] = [{ ability: 'BOMBA', source: 'INITIAL', usedThisRound: true }]
    const snapshot: RoomSnapshot = {
      code: '4821',
      phase: 'PLAYING',
      players: [
        player('P1', { character: 'X', roundsWon: 1, consecutiveTimeouts: 1 }),
        player('P2', { character: 'ESTRELA' }),
      ],
      mySlot: 'P1',
      round: 2,
      suddenDeath: false,
      board: cells('XO..............'),
      turn: { player: 'P2', startedAt: clock, durationSeconds: 10 },
      myDeck: deck,
      outcome: null,
      serverTime: clock,
    }
    send('ROOM_SNAPSHOT', snapshot)

    expect(useRoomStore.getState()).toMatchObject({ code: '4821', phase: 'PLAYING', mySlot: 'P1' })
    expect(match()).toMatchObject({
      round: 2,
      score: { P1: 1, P2: 0 },
      consecutiveTimeouts: { P1: 1, P2: 0 },
    })
    expect(useBoardStore.getState().cells[1].owner).toBe('P2')
    expect(useTimerStore.getState().turn?.player).toBe('P2')
    expect(usePowersStore.getState().deck).toEqual(deck)
  })

  it('oponente cai e volta', () => {
    send('PLAYER_DISCONNECTED', { slot: 'P2', reconnectDeadline: clock + 30_000 })
    const room = () => useRoomStore.getState()
    expect(room().players.find((p) => p.slot === 'P2')?.connected).toBe(false)
    expect(room().reconnectDeadlines.P2).toBeDefined()

    send('PLAYER_RECONNECTED', { slot: 'P2' })
    expect(room().players.find((p) => p.slot === 'P2')?.connected).toBe(true)
    expect(room().reconnectDeadlines.P2).toBeUndefined()
  })
})

describe('Preparação, sorteio e habilidades', () => {
  it('DRAFT_UPDATE bloqueia o personagem de cada lado', () => {
    send('DRAFT_UPDATE', {
      deadline: clock + 20_000,
      characters: { P1: 'CORACAO' },
      ready: { P1: true, P2: false },
    })
    expect(useDraftStore.getState()).toMatchObject({
      characters: { P1: 'CORACAO' },
      ready: { P1: true, P2: false },
    })
    expect(useRoomStore.getState().players[0].character).toBe('CORACAO')
  })

  it('sorteio e deck vêm do servidor; o deck novo fecha o sorteio', () => {
    send('DRAW_OPTIONS', { options: ['TORNADO', 'SILENCIO', 'CONGELAR'], deadline: clock + 8000 })
    expect(usePowersStore.getState().drawOptions?.options).toHaveLength(3)

    const deck: DeckSlot[] = [
      { ability: 'BOMBA', source: 'INITIAL', usedThisRound: false },
      { ability: 'ESCUDO', source: 'INITIAL', usedThisRound: false },
      { ability: 'SILENCIO', source: 'DRAWN', usedThisRound: false },
    ]
    send('DECK_UPDATE', { deck })
    expect(usePowersStore.getState()).toMatchObject({ deck, drawOptions: null })
  })

  it('a mira é local, mas qualquer resolução do servidor a encerra', () => {
    const powers = () => usePowersStore.getState()
    powers().startAim('TORNADO')
    powers().selectAimCell(5)
    expect(powers().aim).toEqual({ ability: 'TORNADO', selectedCell: 5 })

    send('ABILITY_RESOLVED', {
      by: 'P1',
      ability: 'TORNADO',
      targetCell: 5,
      destinationCell: 6,
      absorbed: false,
      noEffect: false,
    })
    expect(powers().aim).toBeNull()
    expect(useBoardStore.getState().lastAbility).toMatchObject({ ability: 'TORNADO', by: 'P1' })

    powers().startAim('BOMBA')
    send('TURN_START', turn('P2'))
    expect(powers().aim).toBeNull()
  })

  it('BOARD_UPDATE troca as casas', () => {
    send('BOARD_UPDATE', { board: cells('X...............') })
    expect(useBoardStore.getState().cells[0].owner).toBe('P1')
  })
})

describe('fase, revanche e sala', () => {
  it('PHASE_CHANGE para DRAFT (revanche aceita) recomeça a partida do zero', () => {
    send('ROUND_END', { round: 1, winner: 'P1', winningLine: null, score: { P1: 1, P2: 0 } })
    send('PHASE_CHANGE', { phase: 'DRAFT' })
    expect(useRoomStore.getState().phase).toBe('DRAFT')
    expect(match().score).toEqual({ P1: 0, P2: 0 })
    expect(useRoomStore.getState().players).toHaveLength(2)
  })

  it('pedido de revanche e cancelamento', () => {
    send('REMATCH_REQUESTED', { by: 'P2', deadline: clock + 15_000 })
    expect(match().rematch).toMatchObject({ requestedBy: 'P2' })
    send('REMATCH_CANCELLED', { reason: 'TIMEOUT' })
    expect(match()).toMatchObject({ rematch: null, rematchCancelled: 'TIMEOUT' })
  })

  it('sala encerrada, erro e saída do jogador', () => {
    send('ERROR', { code: 'NOT_YOUR_TURN', message: 'Não é a sua vez' })
    expect(useRoomStore.getState().lastError).toMatchObject({ code: 'NOT_YOUR_TURN' })
    send('PLAYER_LEFT', { slot: 'P2' })
    expect(useRoomStore.getState().players.map((p) => p.slot)).toEqual(['P1'])
    send('ROOM_CLOSED', { reason: 'Oponente voltou ao lobby' })
    expect(useRoomStore.getState().closedReason).toBe('Oponente voltou ao lobby')
  })
})

describe('infraestrutura', () => {
  it('cada evento sincroniza o relógio com o servidor', () => {
    useClockStore.getState().reset() // o beforeEach já mandou eventos sem diferença de relógio
    applyServerEvent(
      { type: 'BOARD_UPDATE', payload: { board: cells('................') }, serverTime: 5000 },
      7000,
    )
    expect(useClockStore.getState().offsetMs).toBe(-2000)
  })

  it('evento local (gerado no front) não sincroniza o relógio', () => {
    useClockStore.getState().reset()
    applyServerEvent(
      {
        type: 'ERROR',
        payload: { code: 'NOT_CONNECTED', message: 'Sem conexão' },
        serverTime: 999_999,
        local: true,
      },
      1000,
    )
    expect(useClockStore.getState().offsetMs).toBe(0)
    expect(useRoomStore.getState().lastError?.code).toBe('NOT_CONNECTED')
  })

  it('as stores de jogo não expõem setters para os componentes', () => {
    for (const state of [
      useMatchStore.getState(),
      useBoardStore.getState(),
      useDraftStore.getState(),
      useTimerStore.getState(),
    ]) {
      expect(Object.values(state).some((v) => typeof v === 'function')).toBe(false)
    }
  })

  it('resetGameStores limpa a partida, mas mantém o link direto pendente', () => {
    useRoomStore.getState().setPendingRoomCode('4821')
    send('ROUND_START', { round: 2, startingPlayer: 'P1', suddenDeath: false })
    resetGameStores()
    expect(match().round).toBe(0)
    expect(useRoomStore.getState().players).toEqual([])
    expect(useRoomStore.getState().pendingRoomCode).toBe('4821')
  })
})
