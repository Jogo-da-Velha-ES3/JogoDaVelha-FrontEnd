import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PREPARATION_SECONDS,
  REMATCH_WINDOW_SECONDS,
  TURN_DURATION_SECONDS,
} from '../../constants/game'
import type { AbilityId, PlayerSlot } from '../../types/game'
import type { ClientCommand, ServerEnvelope, ServerEvent } from '../../types/events'
import { MOCK_TIMINGS, MockGameServer } from './mockServer'
import { type BotRematch, resolveBotRematch, type Scenario, SCENARIOS } from './scenarios'

type Payload<T extends ServerEvent['type']> = Extract<ServerEvent, { type: T }>['payload']

/** Bot parado: os testes controlam o P2 na mão, com receive('P2', …) */
const MANUAL: Scenario = { id: 'normal', scriptedRounds: [], botIdle: true }

/** Gerador pseudoaleatório com semente, para o sorteio ser sempre o mesmo */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31
    return s / 2 ** 31
  }
}

function setup(scenario: Scenario = MANUAL, seed = 7, botRematch?: BotRematch) {
  const events: ServerEnvelope[] = []
  const server = new MockGameServer({
    roomCode: '4821',
    emit: (e) => events.push(e),
    scenario,
    botRematch,
    random: seeded(seed),
  })
  server.start()
  const all = <T extends ServerEvent['type']>(type: T) =>
    events.filter((e) => e.type === type).map((e) => e.payload as Payload<T>)
  const last = <T extends ServerEvent['type']>(type: T) => all(type).at(-1)
  const phases = () => all('PHASE_CHANGE').map((p) => p.phase)
  const send = (cmd: ClientCommand, slot: PlayerSlot = 'P1') => server.receive(slot, cmd)
  const move = (cell: number, slot: PlayerSlot = 'P1') =>
    send({ type: 'MOVE', payload: { cell } }, slot)
  const turnOf = () => last('TURN_START')?.player
  return { server, events, all, last, phases, send, move, turnOf }
}

type Ctx = ReturnType<typeof setup>

/** Da sala até o primeiro turno do round 1. Opcional: escolhas do bot na Preparação. */
function toFirstTurn(ctx: Ctx, botAbilities?: [AbilityId, AbilityId]) {
  vi.advanceTimersByTime(MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched)
  if (botAbilities) {
    ctx.send({ type: 'DRAFT_CHARACTER', payload: { character: 'O' } }, 'P2')
    ctx.send({ type: 'DRAFT_ABILITIES', payload: { abilities: botAbilities } }, 'P2')
  }
  ctx.send({ type: 'DRAFT_CHARACTER', payload: { character: 'X' } })
  ctx.send({ type: 'DRAFT_ABILITIES', payload: { abilities: ['BOMBA', 'SILENCIO'] } })
  vi.advanceTimersByTime(MOCK_TIMINGS.botDraft + MOCK_TIMINGS.versus)
  pickDraws(ctx)
}

function pickDraws(ctx: Ctx) {
  ctx.send({ type: 'DRAW_PICK', payload: { ability: ctx.last('DRAW_OPTIONS')!.options[0] } })
  vi.advanceTimersByTime(MOCK_TIMINGS.botDraw)
}

/** Se a vez for do P2, ele joga numa casa inofensiva para devolver a vez ao P1 */
function ensureMyTurn(ctx: Ctx, botCell = 15) {
  if (ctx.turnOf() === 'P2') ctx.move(botCell, 'P2')
  expect(ctx.turnOf()).toBe('P1')
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('sala e Preparação', () => {
  it('você entra, o bot chega, MATCH FEITO e Preparação de 20s', () => {
    const ctx = setup()
    expect(ctx.events[0]).toMatchObject({ type: 'ROOM_SNAPSHOT' })
    expect(ctx.last('ROOM_SNAPSHOT')).toMatchObject({ phase: 'WAITING', mySlot: 'P1' })

    vi.advanceTimersByTime(MOCK_TIMINGS.botJoin)
    expect(ctx.last('PLAYER_JOINED')?.player.slot).toBe('P2')
    expect(ctx.phases()).toEqual(['MATCHED'])

    vi.advanceTimersByTime(MOCK_TIMINGS.matched)
    expect(ctx.phases()).toEqual(['MATCHED', 'DRAFT'])
    expect(ctx.last('DRAFT_UPDATE')?.deadline).toBe(Date.now() + PREPARATION_SECONDS * 1000)
  })

  it('personagem do oponente fica bloqueado [RN-DRAFT-01]', () => {
    const ctx = setup()
    vi.advanceTimersByTime(MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched)
    ctx.send({ type: 'DRAFT_CHARACTER', payload: { character: 'ESTRELA' } }, 'P2')
    ctx.send({ type: 'DRAFT_CHARACTER', payload: { character: 'ESTRELA' } })
    expect(ctx.last('ERROR')?.code).toBe('CHARACTER_TAKEN')
  })

  it('sem escolha em 20s, o servidor escolhe por você e segue para o VS', () => {
    const ctx = setup()
    vi.advanceTimersByTime(MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched)
    vi.advanceTimersByTime(PREPARATION_SECONDS * 1000)
    const draft = ctx.last('DRAFT_UPDATE')!
    expect(draft.ready).toEqual({ P1: true, P2: true })
    expect(draft.characters.P1).not.toBe(draft.characters.P2)
    expect(ctx.phases().at(-1)).toBe('VERSUS')
  })
})

describe('round', () => {
  it('sorteio de 3 cartas sem as iniciais, deck privado e primeiro turno', () => {
    const ctx = setup()
    vi.advanceTimersByTime(MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched)
    ctx.send({ type: 'DRAFT_CHARACTER', payload: { character: 'X' } })
    ctx.send({ type: 'DRAFT_ABILITIES', payload: { abilities: ['BOMBA', 'SILENCIO'] } })
    vi.advanceTimersByTime(MOCK_TIMINGS.botDraft + MOCK_TIMINGS.versus)

    expect(ctx.last('ROUND_START')).toMatchObject({ round: 1, suddenDeath: false })
    expect(ctx.last('DECK_UPDATE')?.deck.map((d) => d.ability)).toEqual(['BOMBA', 'SILENCIO'])
    const { options } = ctx.last('DRAW_OPTIONS')!
    expect(options).toHaveLength(3)
    expect(options).not.toContain('BOMBA')
    expect(options).not.toContain('SILENCIO')

    pickDraws(ctx)
    expect(ctx.last('DECK_UPDATE')?.deck).toHaveLength(3)
    expect(ctx.phases().at(-1)).toBe('PLAYING')
    expect(ctx.last('TURN_START')).toMatchObject({
      durationSeconds: TURN_DURATION_SECONDS,
      consecutiveTimeouts: { P1: 0, P2: 0 },
    })
  })

  it('jogada válida, fora da vez e em casa ocupada', () => {
    const ctx = setup()
    toFirstTurn(ctx)
    ensureMyTurn(ctx)

    ctx.move(0)
    expect(ctx.last('BOARD_UPDATE')?.board[0].owner).toBe('P1')
    expect(ctx.turnOf()).toBe('P2')

    ctx.move(1)
    expect(ctx.last('ERROR')?.code).toBe('NOT_YOUR_TURN')

    // Erros do bot são privados dele: o cliente não vê, mas nada muda
    const boards = ctx.all('BOARD_UPDATE').length
    ctx.move(0, 'P2')
    expect(ctx.all('BOARD_UPDATE')).toHaveLength(boards)
    expect(ctx.turnOf()).toBe('P2')

    ctx.move(7, 'P2')
    ctx.move(7)
    expect(ctx.last('ERROR')?.code).toBe('CELL_TAKEN')
  })

  it('4 em linha vence o round e o placar vem do servidor', () => {
    const ctx = setup()
    toFirstTurn(ctx)
    ensureMyTurn(ctx, 7)
    for (const [mine, bot] of [
      [0, 12],
      [1, 13],
      [2, 14],
    ]) {
      ctx.move(mine)
      ctx.move(bot, 'P2')
    }
    ctx.move(3)
    expect(ctx.last('ROUND_END')).toEqual({
      round: 1,
      winner: 'P1',
      winningLine: [0, 1, 2, 3],
      score: { P1: 1, P2: 0 },
    })
    expect(ctx.phases().at(-1)).toBe('ROUND_END')

    vi.advanceTimersByTime(MOCK_TIMINGS.roundEnd)
    expect(ctx.last('ROUND_START')?.round).toBe(2)
  })
})

describe('estouros e W.O. [RN-ARN-01]', () => {
  it('3 estouros seguidos = derrota por W.O.', () => {
    const ctx = setup()
    toFirstTurn(ctx)
    ensureMyTurn(ctx)
    for (let i = 1; i <= 3; i++) {
      vi.advanceTimersByTime(TURN_DURATION_SECONDS * 1000) // meu tempo acaba
      expect(ctx.last('TURN_TIMEOUT')).toEqual({ player: 'P1', consecutiveTimeouts: i })
      if (i < 3) ctx.move(10 + i, 'P2')
    }
    expect(ctx.last('MATCH_END')).toEqual({
      outcome: { kind: 'WO', winner: 'P2' },
      coins: { P1: 0, P2: 30 },
    })
    expect(ctx.phases().at(-1)).toBe('RESULT')
  })

  it('o contador zera quando o jogador age e o valor vai no TURN_START', () => {
    const ctx = setup()
    toFirstTurn(ctx)
    ensureMyTurn(ctx)
    vi.advanceTimersByTime(TURN_DURATION_SECONDS * 1000)
    expect(ctx.last('TURN_START')?.consecutiveTimeouts.P1).toBe(1)
    ctx.move(12, 'P2')
    ctx.move(0)
    ctx.move(13, 'P2')
    expect(ctx.last('TURN_START')).toMatchObject({ player: 'P1', consecutiveTimeouts: { P1: 0 } })
  })

  it('o contador não zera na troca de round', () => {
    const ctx = setup()
    toFirstTurn(ctx)
    ensureMyTurn(ctx, 15)
    for (const [mine, bot] of [
      [8, 0],
      [9, 1],
      [10, 2],
    ]) {
      ctx.move(mine)
      ctx.move(bot, 'P2')
    }
    vi.advanceTimersByTime(TURN_DURATION_SECONDS * 1000) // P1: 1/3, sem agir depois
    ctx.move(3, 'P2') // bot completa a linha
    expect(ctx.last('ROUND_END')?.winner).toBe('P2')
    vi.advanceTimersByTime(MOCK_TIMINGS.roundEnd)
    pickDraws(ctx)
    expect(ctx.last('TURN_START')?.consecutiveTimeouts.P1).toBe(1)
  })

  it('cenário "wo": o bot não joga e perde por W.O.', () => {
    const ctx = setup(SCENARIOS.wo)
    toFirstTurn(ctx)
    ensureMyTurn(ctx)
    for (const cell of [5, 6, 9]) {
      ctx.move(cell)
      vi.advanceTimersByTime(TURN_DURATION_SECONDS * 1000) // o bot estoura
    }
    expect(ctx.last('MATCH_END')?.outcome).toEqual({ kind: 'WO', winner: 'P1' })
  })
})

describe('habilidades no servidor', () => {
  it('uma vez por round, consome o turno e atualiza o deck', () => {
    const ctx = setup()
    toFirstTurn(ctx)
    ensureMyTurn(ctx, 15)
    ctx.move(0)
    ctx.move(5, 'P2')
    ctx.send({ type: 'USE_ABILITY', payload: { ability: 'BOMBA', targetCell: 5 } })
    expect(ctx.last('ABILITY_RESOLVED')).toMatchObject({
      by: 'P1',
      ability: 'BOMBA',
      targetCell: 5,
    })
    expect(ctx.last('BOARD_UPDATE')?.board[5].owner).toBeNull()
    expect(ctx.last('DECK_UPDATE')?.deck.find((d) => d.ability === 'BOMBA')?.usedThisRound).toBe(
      true,
    )
    expect(ctx.turnOf()).toBe('P2')

    ctx.move(6, 'P2')
    ctx.send({ type: 'USE_ABILITY', payload: { ability: 'BOMBA', targetCell: 6 } })
    expect(ctx.last('ERROR')?.code).toBe('ABILITY_UNAVAILABLE')
  })

  it('Silêncio do oponente impede você de usar habilidade só no turno seguinte', () => {
    const ctx = setup()
    toFirstTurn(ctx, ['SILENCIO', 'ESCUDO'])
    if (ctx.turnOf() === 'P1') ctx.move(0)
    ctx.move(5, 'P2')
    ctx.move(1)
    ctx.send({ type: 'USE_ABILITY', payload: { ability: 'SILENCIO' } }, 'P2')
    expect(ctx.last('ABILITY_RESOLVED')).toMatchObject({ by: 'P2', ability: 'SILENCIO' })

    ctx.send({ type: 'USE_ABILITY', payload: { ability: 'BOMBA', targetCell: 5 } })
    expect(ctx.last('ERROR')?.code).toBe('SILENCED')
    ctx.move(2) // jogar peça continua valendo

    ctx.move(6, 'P2')
    ctx.send({ type: 'USE_ABILITY', payload: { ability: 'BOMBA', targetCell: 5 } })
    expect(ctx.last('ABILITY_RESOLVED')).toMatchObject({ by: 'P1', ability: 'BOMBA' })
  })
})

describe('cenários prontos', () => {
  /** Deixa a Preparação acabar sozinha e os rounds automáticos rodarem */
  const finish = () => {
    vi.advanceTimersByTime(MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched)
    vi.advanceTimersByTime(PREPARATION_SECONDS * 1000 + MOCK_TIMINGS.versus)
    vi.advanceTimersByTime(3 * (2 * MOCK_TIMINGS.scriptedStep + MOCK_TIMINGS.roundEnd))
  }

  it('vitoria: 2×0 sem jogar', () => {
    const ctx = setup(SCENARIOS.vitoria)
    finish()
    expect(ctx.last('MATCH_END')).toEqual({
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
      coins: { P1: 50, P2: 10 },
    })
  })

  it('empate-absoluto: 1×1 e empate na Morte Súbita [RN-ARN-06]', () => {
    const ctx = setup(SCENARIOS['empate-absoluto'])
    finish()
    expect(ctx.all('ROUND_START').map((r) => r.suddenDeath)).toEqual([false, false, true])
    expect(ctx.last('MATCH_END')).toEqual({
      outcome: { kind: 'ABSOLUTE_DRAW' },
      coins: { P1: 20, P2: 20 },
    })
  })

  it('morte-subita: 1×1 automático e o round 3 é seu, com turnos de 5s', () => {
    const ctx = setup(SCENARIOS['morte-subita'])
    finish()
    pickDraws(ctx)
    expect(ctx.last('ROUND_START')).toMatchObject({ round: 3, suddenDeath: true })
    expect(ctx.last('TURN_START')?.durationSeconds).toBe(5)
    expect(ctx.last('MATCH_END')).toBeUndefined()
  })
})

describe('revanche e saída', () => {
  /** Cenário "vitoria" até o Resultado, com o comportamento do bot no fim */
  function toResult(botRematch?: BotRematch) {
    const ctx = setup(SCENARIOS.vitoria, 7, botRematch)
    vi.advanceTimersByTime(MOCK_TIMINGS.botJoin + MOCK_TIMINGS.matched)
    vi.advanceTimersByTime(PREPARATION_SECONDS * 1000 + MOCK_TIMINGS.versus)
    vi.advanceTimersByTime(2 * (2 * MOCK_TIMINGS.scriptedStep + MOCK_TIMINGS.roundEnd))
    expect(ctx.phases().at(-1)).toBe('RESULT')
    return ctx
  }

  const requestRematch = (ctx: Ctx, slot: PlayerSlot = 'P1') =>
    ctx.send({ type: 'REMATCH_REQUEST', payload: {} }, slot)
  const respond = (ctx: Ctx, accept: boolean, slot: PlayerSlot = 'P1') =>
    ctx.send({ type: 'REMATCH_RESPOND', payload: { accept } }, slot)

  it('aceita: volta para a Preparação do zero [RN-POS-03]', () => {
    const ctx = toResult()
    requestRematch(ctx)
    expect(ctx.last('REMATCH_REQUESTED')).toEqual({
      by: 'P1',
      deadline: Date.now() + REMATCH_WINDOW_SECONDS * 1000,
    })
    vi.advanceTimersByTime(MOCK_TIMINGS.rematchAccept)
    expect(ctx.phases().at(-1)).toBe('DRAFT')
    expect(ctx.last('DRAFT_UPDATE')?.characters).toEqual({})
    expect(ctx.last('REMATCH_CANCELLED')).toBeUndefined()
  })

  it('recusa: pedido cancelado e sala encerrada', () => {
    const ctx = toResult('recusa')
    requestRematch(ctx)
    vi.advanceTimersByTime(MOCK_TIMINGS.rematchAccept)
    expect(ctx.last('REMATCH_CANCELLED')).toEqual({ reason: 'DECLINED' })
    expect(ctx.last('ROOM_CLOSED')).toBeDefined()

    requestRematch(ctx)
    expect(ctx.last('ERROR')?.code).toBe('ROOM_CLOSED')
  })

  it('ignora: o pedido cai depois de 15s [RN-POS-01]', () => {
    const ctx = toResult('ignora')
    requestRematch(ctx)
    vi.advanceTimersByTime(REMATCH_WINDOW_SECONDS * 1000 - 1)
    expect(ctx.last('REMATCH_CANCELLED')).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(ctx.last('REMATCH_CANCELLED')).toEqual({ reason: 'TIMEOUT' })
    expect(ctx.last('ROOM_CLOSED')).toBeDefined()
  })

  it('pede: o bot pede e você aceita, recusa ou pede junto', () => {
    const accept = toResult('pede')
    vi.advanceTimersByTime(MOCK_TIMINGS.botRematch)
    expect(accept.last('REMATCH_REQUESTED')?.by).toBe('P2')
    respond(accept, true)
    expect(accept.phases().at(-1)).toBe('DRAFT')

    const decline = toResult('pede')
    vi.advanceTimersByTime(MOCK_TIMINGS.botRematch)
    respond(decline, false)
    expect(decline.last('REMATCH_CANCELLED')).toEqual({ reason: 'DECLINED' })

    // Os dois pediram: vale como aceite
    const both = toResult('pede')
    vi.advanceTimersByTime(MOCK_TIMINGS.botRematch)
    requestRematch(both)
    expect(both.phases().at(-1)).toBe('DRAFT')
  })

  it('responder sem pedido (ou ao próprio pedido) é erro', () => {
    const ctx = toResult('ignora')
    respond(ctx, true)
    expect(ctx.last('ERROR')?.code).toBe('NO_REMATCH')
    requestRematch(ctx)
    respond(ctx, true)
    expect(ctx.last('ERROR')?.code).toBe('NO_REMATCH')
    requestRematch(ctx)
    expect(ctx.last('ERROR')?.code).toBe('REMATCH_PENDING')
  })

  it('sai: o bot volta ao Lobby e cancela o seu pedido', () => {
    const ctx = toResult('sai')
    requestRematch(ctx)
    vi.advanceTimersByTime(MOCK_TIMINGS.botRematch)
    expect(ctx.last('REMATCH_CANCELLED')).toEqual({ reason: 'LEFT' })
    expect(ctx.last('PLAYER_LEFT')).toEqual({ slot: 'P2' })
    expect(ctx.last('ROOM_CLOSED')).toBeDefined()

    // Nada mais acontece: o prazo dos 15s também foi cancelado
    const count = ctx.events.length
    vi.advanceTimersByTime(60_000)
    expect(ctx.events).toHaveLength(count)
  })

  it('?revanche= na URL tem prioridade sobre a variável de ambiente', () => {
    expect(resolveBotRematch('?revanche=sai', 'recusa')).toBe('sai')
    expect(resolveBotRematch('?revanche=xyz', 'recusa')).toBe('recusa')
    expect(resolveBotRematch('', undefined)).toBe('aceita')
  })

  it('sair encerra a sala e para tudo', () => {
    const ctx = setup()
    ctx.send({ type: 'LEAVE', payload: {} })
    expect(ctx.last('ROOM_CLOSED')).toBeDefined()
    const count = ctx.events.length
    vi.advanceTimersByTime(60_000)
    expect(ctx.events).toHaveLength(count)
  })
})
