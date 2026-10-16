// Servidor simulado (FE-35): faz o papel do back no próprio front e emite os mesmos eventos do
// contrato (ARCHITECTURE §6). Ele é o "servidor autoritativo" do modo simulado: decide jogadas,
// vitória, placar e timeout com as regras de src/lib. Você é sempre o P1; o bot é o P2.
import {
  ABILITIES,
  DRAW_OPTIONS,
  DRAW_PICK_SECONDS,
  EFFECT_DURATION_TURNS,
  HOURGLASS_TURN_DURATION_SECONDS,
  MATCH_FOUND_COUNTDOWN_SECONDS,
  MAX_CONSECUTIVE_TIMEOUTS,
  MAX_ROUNDS,
  PREPARATION_SECONDS,
  REMATCH_WINDOW_SECONDS,
  STARTER_ABILITIES,
  STARTER_CHARACTERS,
  SUDDEN_DEATH_TURN_DURATION_SECONDS,
  TURN_DURATION_SECONDS,
  CHARACTERS,
  BOARD_CELLS,
} from '../../constants/game'
import {
  coinsFor,
  matchStatus,
  otherSlot,
  type RoundResult,
  scoreOf,
  startingPlayer,
} from '../../lib/match'
import { evaluateBoard } from '../../lib/winCheck'
import type {
  AbilityId,
  Cell,
  CharacterId,
  DeckSlot,
  MatchOutcome,
  PlayerSlot,
  PlayerState,
  RoomPhase,
  TurnState,
} from '../../types/game'
import type { ClientCommand, ServerEnvelope, ServerEvent } from '../../types/events'
import { isBlockedFor, resolveAbility, type ShieldOwners, tickEffects } from './abilities'
import { chooseBotAction } from './bot'
import { type BotRematch, SCENARIOS, type Scenario } from './scenarios'

/** Pausas do simulado (ms). As durações de jogo vêm das constantes da ERS. */
export const MOCK_TIMINGS = {
  botJoin: 1500,
  matched: MATCH_FOUND_COUNTDOWN_SECONDS * 1000,
  versus: 3000,
  roundEnd: 2500,
  scriptedStep: 1200,
  botDraft: 2500,
  botDraw: 1500,
  botThinkMin: 800,
  botThinkMax: 2000,
  /** Quanto o bot demora para responder à revanche */
  rematchAccept: 2000,
  /** Quanto o bot espera no Resultado antes de pedir revanche ou sair (`pede`, `sai`) */
  botRematch: 3000,
}

const ROOM_CLOSED_REASON = {
  TIMEOUT: 'O tempo da revanche acabou.',
  DECLINED: 'A revanche foi recusada.',
  LEFT: 'O oponente saiu da sala.',
} as const

interface MockPlayer extends PlayerState {
  initialAbilities: AbilityId[] | null
  drawOptions: AbilityId[]
  drawn: AbilityId | null
  used: Set<AbilityId>
}

type EventOf<T extends ServerEvent['type']> = Extract<ServerEvent, { type: T }>['payload']

export interface MockServerOptions {
  roomCode: string
  emit: (envelope: ServerEnvelope) => void
  scenario?: Scenario
  /** O que o bot faz no Resultado; padrão: aceita a revanche */
  botRematch?: BotRematch
  nickname?: string
  random?: () => number
}

const emptyCells = (): Cell[] =>
  Array.from({ length: BOARD_CELLS }, (_, index) => ({ index, owner: null, effects: [] }))

/** Tabuleiro pronto para os rounds automáticos dos cenários */
function scriptedBoard(winner: RoundResult): { cells: Cell[]; line: number[] | null } {
  const rows =
    winner === 'P1' ? 'XXXXOO..O.......' : winner === 'P2' ? 'OOOOXX..X.......' : 'XXOOOOXXXXOOOOXX'
  const cells = rows.split('').map((c, index) => ({
    index,
    owner: (c === 'X' ? 'P1' : c === 'O' ? 'P2' : null) as PlayerSlot | null,
    effects: [],
  }))
  return { cells, line: winner ? [0, 1, 2, 3] : null }
}

export class MockGameServer {
  private readonly scenario: Scenario
  private readonly botRematch: BotRematch
  private readonly random: () => number
  private phase: RoomPhase = 'WAITING'
  private players: Partial<Record<PlayerSlot, MockPlayer>> = {}
  private round = 0
  private results: RoundResult[] = []
  private firstStarter: PlayerSlot = 'P1'
  private roundStarter: PlayerSlot = 'P1'
  private suddenDeath = false
  private cells: Cell[] = emptyCells()
  private shieldOwners: ShieldOwners = {}
  private turn: TurnState | null = null
  private hourglassFor: PlayerSlot | null = null
  private draftDeadline = 0
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private turnTimer: ReturnType<typeof setTimeout> | null = null
  private phaseTimer: ReturnType<typeof setTimeout> | null = null
  /** Pedido de revanche em aberto e o prazo dos 15s [RN-POS-01] */
  private rematch: { by: PlayerSlot; timer: ReturnType<typeof setTimeout> } | null = null
  /** Sala encerrada (revanche cancelada ou alguém saiu): não aceita mais nada */
  private closed = false
  private stopped = false

  private readonly options: MockServerOptions

  constructor(options: MockServerOptions) {
    this.options = options
    this.scenario = options.scenario ?? SCENARIOS.normal
    this.botRematch = options.botRematch ?? 'aceita'
    this.random = options.random ?? Math.random
  }

  // ---------------------------------------------------------------- infraestrutura

  start() {
    this.players.P1 = this.newPlayer('P1', this.options.nickname ?? 'Você')
    this.emit('ROOM_SNAPSHOT', {
      code: this.options.roomCode,
      phase: this.phase,
      players: [this.publicState('P1')],
      mySlot: 'P1',
      round: 0,
      suddenDeath: false,
      board: this.cells,
      turn: null,
      myDeck: [],
      outcome: null,
      serverTime: Date.now(),
    })
    this.later(MOCK_TIMINGS.botJoin, () => this.botJoin())
  }

  stop() {
    this.stopped = true
    this.timers.forEach(clearTimeout)
    this.timers.clear()
  }

  /** Intenção que chegou do cliente (você, P1) */
  handleClient(command: ClientCommand) {
    this.receive('P1', command)
  }

  private later(ms: number, fn: () => void) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      if (!this.stopped) fn()
    }, ms)
    this.timers.add(id)
    return id
  }

  private cancel(id: ReturnType<typeof setTimeout> | null) {
    if (id === null) return
    clearTimeout(id)
    this.timers.delete(id)
  }

  /** Só o que é público ou é do P1 chega ao cliente; o privado do bot fica aqui */
  private emit<T extends ServerEvent['type']>(
    type: T,
    payload: EventOf<T>,
    to: 'ALL' | PlayerSlot = 'ALL',
  ) {
    if (to === 'P2') return
    this.options.emit({ type, payload, serverTime: Date.now() } as ServerEnvelope)
  }

  private error(slot: PlayerSlot, code: string, message: string) {
    this.emit('ERROR', { code, message }, slot)
  }

  private setPhase(phase: RoomPhase) {
    this.phase = phase
    this.emit('PHASE_CHANGE', { phase })
  }

  private player(slot: PlayerSlot): MockPlayer {
    const p = this.players[slot]
    if (!p) throw new Error(`Jogador ${slot} não está na sala`)
    return p
  }

  private newPlayer(slot: PlayerSlot, nickname: string): MockPlayer {
    return {
      slot,
      userId: `mock-${slot}`,
      nickname,
      character: null,
      roundsWon: 0,
      consecutiveTimeouts: 0,
      forceFieldTurnsLeft: 0,
      silenced: false,
      connected: true,
      initialAbilities: null,
      drawOptions: [],
      drawn: null,
      used: new Set(),
    }
  }

  private publicState(slot: PlayerSlot): PlayerState {
    const {
      initialAbilities: _a,
      drawOptions: _o,
      drawn: _d,
      used: _u,
      ...state
    } = this.player(slot)
    return state
  }

  private pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length)]
  }

  private sample<T>(items: readonly T[], n: number): T[] {
    const pool = [...items]
    const chosen: T[] = []
    while (chosen.length < n && pool.length > 0) {
      chosen.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0])
    }
    return chosen
  }

  /** Intenção de qualquer lado. O P2 é o bot; os testes usam isto para controlá-lo. */
  receive(slot: PlayerSlot, command: ClientCommand) {
    if (this.closed) {
      if (command.type === 'LEAVE') return this.stop()
      return this.error(slot, 'ROOM_CLOSED', 'A sala foi encerrada.')
    }
    switch (command.type) {
      case 'DRAFT_CHARACTER':
        return this.pickCharacter(slot, command.payload.character)
      case 'DRAFT_ABILITIES':
        return this.pickAbilities(slot, command.payload.abilities)
      case 'DRAW_PICK':
        return this.pickDraw(slot, command.payload.ability)
      case 'MOVE':
        return this.move(slot, command.payload.cell)
      case 'USE_ABILITY': {
        const { ability, targetCell, destinationCell } = command.payload
        return this.useAbility(slot, ability, targetCell, destinationCell)
      }
      case 'REMATCH_REQUEST':
        return this.requestRematch(slot)
      case 'REMATCH_RESPOND':
        return this.respondRematch(slot, command.payload.accept)
      case 'LEAVE':
        return this.leave(slot)
    }
  }

  // ---------------------------------------------------------------- sala e Preparação

  private botJoin() {
    this.players.P2 = this.newPlayer('P2', 'Oponente Simulado')
    this.emit('PLAYER_JOINED', { player: this.publicState('P2') })
    this.setPhase('MATCHED')
    this.later(MOCK_TIMINGS.matched, () => this.startDraft())
  }

  private startDraft() {
    this.rematch = null
    for (const slot of ['P1', 'P2'] as const) {
      const p = this.player(slot)
      this.players[slot] = this.newPlayer(slot, p.nickname)
    }
    this.round = 0
    this.results = []
    this.cells = emptyCells()
    this.shieldOwners = {}
    this.draftDeadline = Date.now() + PREPARATION_SECONDS * 1000
    this.setPhase('DRAFT')
    this.emitDraft()
    this.phaseTimer = this.later(PREPARATION_SECONDS * 1000, () => this.finishDraft())
    this.later(MOCK_TIMINGS.botDraft, () => this.botDraft())
  }

  private emitDraft() {
    const characters: Partial<Record<PlayerSlot, CharacterId>> = {}
    const ready = { P1: false, P2: false }
    for (const slot of ['P1', 'P2'] as const) {
      const p = this.player(slot)
      if (p.character) characters[slot] = p.character
      ready[slot] = p.character !== null && p.initialAbilities !== null
    }
    this.emit('DRAFT_UPDATE', { deadline: this.draftDeadline, characters, ready })
  }

  private pickCharacter(slot: PlayerSlot, character: CharacterId) {
    if (this.phase !== 'DRAFT') return this.error(slot, 'WRONG_PHASE', 'A Preparação já acabou.')
    if (this.player(otherSlot(slot)).character === character) {
      return this.error(slot, 'CHARACTER_TAKEN', 'Esse personagem já foi escolhido pelo oponente.')
    }
    this.player(slot).character = character
    this.emitDraft()
    this.maybeFinishDraft()
  }

  private pickAbilities(slot: PlayerSlot, abilities: [AbilityId, AbilityId]) {
    if (this.phase !== 'DRAFT') return this.error(slot, 'WRONG_PHASE', 'A Preparação já acabou.')
    if (abilities[0] === abilities[1] || !abilities.every((a) => ABILITIES.includes(a))) {
      return this.error(slot, 'INVALID_ABILITIES', 'Escolha 2 habilidades diferentes.')
    }
    this.player(slot).initialAbilities = [...abilities]
    this.emitDraft()
    this.maybeFinishDraft()
  }

  private maybeFinishDraft() {
    const ready = (['P1', 'P2'] as const).every((s) => {
      const p = this.player(s)
      return p.character !== null && p.initialAbilities !== null
    })
    if (ready) this.finishDraft()
  }

  private botDraft() {
    if (this.phase !== 'DRAFT') return
    const bot = this.player('P2')
    const taken = this.player('P1').character
    if (!bot.character) bot.character = this.pick(CHARACTERS.filter((c) => c !== taken))
    if (!bot.initialAbilities) bot.initialAbilities = this.sample(ABILITIES, 2)
    this.emitDraft()
    this.maybeFinishDraft()
  }

  /** Fim dos 20s ou os dois prontos: quem não escolheu recebe uma escolha aleatória */
  private finishDraft() {
    if (this.phase !== 'DRAFT') return
    this.cancel(this.phaseTimer)
    for (const slot of ['P1', 'P2'] as const) {
      const p = this.player(slot)
      const taken = this.player(otherSlot(slot)).character
      if (!p.character) {
        const starters = STARTER_CHARACTERS.filter((c) => c !== taken)
        p.character = this.pick(
          starters.length > 0 ? starters : CHARACTERS.filter((c) => c !== taken),
        )
      }
      if (!p.initialAbilities) p.initialAbilities = this.sample(STARTER_ABILITIES, 2)
    }
    this.emitDraft()
    this.setPhase('VERSUS')
    this.firstStarter = this.random() < 0.5 ? 'P1' : 'P2'
    this.later(MOCK_TIMINGS.versus, () => this.startRound())
  }

  // ---------------------------------------------------------------- rounds e sorteio

  private deckOf(slot: PlayerSlot): DeckSlot[] {
    const p = this.player(slot)
    const deck: DeckSlot[] = (p.initialAbilities ?? []).map((ability) => ({
      ability,
      source: 'INITIAL',
      usedThisRound: p.used.has(ability),
    }))
    if (p.drawn)
      deck.push({ ability: p.drawn, source: 'DRAWN', usedThisRound: p.used.has(p.drawn) })
    return deck
  }

  private startRound() {
    this.round += 1
    this.suddenDeath = this.round === MAX_ROUNDS
    this.roundStarter = startingPlayer(this.round, this.firstStarter)
    this.cells = emptyCells()
    this.shieldOwners = {}
    this.hourglassFor = null
    this.turn = null
    for (const slot of ['P1', 'P2'] as const) {
      const p = this.player(slot)
      p.silenced = false
      p.forceFieldTurnsLeft = 0
      p.used = new Set()
      p.drawn = null
      p.drawOptions = []
    }
    this.emit('ROUND_START', {
      round: this.round,
      startingPlayer: this.roundStarter,
      suddenDeath: this.suddenDeath,
    })

    const scripted = this.scenario.scriptedRounds
    if (this.round <= scripted.length) return this.playScriptedRound(scripted[this.round - 1])

    this.setPhase('ROUND_DRAW')
    const deadline = Date.now() + DRAW_PICK_SECONDS * 1000
    for (const slot of ['P1', 'P2'] as const) {
      const p = this.player(slot)
      // Pool completo menos as 2 iniciais; pode trazer habilidade não comprada [RF-DRAFT-03]
      p.drawOptions = this.sample(
        ABILITIES.filter((a) => !p.initialAbilities?.includes(a)),
        DRAW_OPTIONS,
      )
      this.emit('DECK_UPDATE', { deck: this.deckOf(slot) }, slot)
      this.emit('DRAW_OPTIONS', { options: p.drawOptions, deadline }, slot)
    }
    this.phaseTimer = this.later(DRAW_PICK_SECONDS * 1000, () => this.finishDraw())
    this.later(MOCK_TIMINGS.botDraw, () =>
      this.pickDraw('P2', this.pick(this.player('P2').drawOptions)),
    )
  }

  private playScriptedRound(winner: RoundResult) {
    this.setPhase('PLAYING')
    this.later(MOCK_TIMINGS.scriptedStep, () => {
      const { cells, line } = scriptedBoard(winner)
      this.cells = cells
      this.emit('BOARD_UPDATE', { board: this.cells })
      this.later(MOCK_TIMINGS.scriptedStep, () => this.endRound(winner, line))
    })
  }

  private pickDraw(slot: PlayerSlot, ability: AbilityId) {
    if (this.phase !== 'ROUND_DRAW') return this.error(slot, 'WRONG_PHASE', 'O sorteio já acabou.')
    const p = this.player(slot)
    if (!p.drawOptions.includes(ability)) {
      return this.error(slot, 'INVALID_DRAW', 'Escolha uma das 3 cartas do sorteio.')
    }
    p.drawn = ability
    this.emit('DECK_UPDATE', { deck: this.deckOf(slot) }, slot)
    if (this.player(otherSlot(slot)).drawn) this.finishDraw()
  }

  /** Fim dos 8s ou os dois escolheram: carta automática para quem não escolheu [RN-DRAFT-05] */
  private finishDraw() {
    if (this.phase !== 'ROUND_DRAW') return
    this.cancel(this.phaseTimer)
    for (const slot of ['P1', 'P2'] as const) {
      const p = this.player(slot)
      if (!p.drawn) {
        p.drawn = this.pick(p.drawOptions)
        this.emit('DECK_UPDATE', { deck: this.deckOf(slot) }, slot)
      }
    }
    this.setPhase('PLAYING')
    this.emit('BOARD_UPDATE', { board: this.cells })
    this.startTurn(this.roundStarter)
  }

  // ---------------------------------------------------------------- turnos

  private startTurn(slot: PlayerSlot) {
    let durationSeconds = TURN_DURATION_SECONDS
    if (this.suddenDeath) durationSeconds = SUDDEN_DEATH_TURN_DURATION_SECONDS
    else if (this.hourglassFor === slot) durationSeconds = HOURGLASS_TURN_DURATION_SECONDS
    if (this.hourglassFor === slot) this.hourglassFor = null

    this.turn = { player: slot, startedAt: Date.now(), durationSeconds }
    this.emit('TURN_START', {
      ...this.turn,
      consecutiveTimeouts: {
        P1: this.player('P1').consecutiveTimeouts,
        P2: this.player('P2').consecutiveTimeouts,
      },
    })
    this.turnTimer = this.later(durationSeconds * 1000, () => this.timeout(slot))

    if (slot === 'P2' && !this.scenario.botIdle) {
      const { botThinkMin: min, botThinkMax: max } = MOCK_TIMINGS
      this.later(min + this.random() * (max - min), () => this.botAct())
    }
  }

  private botAct() {
    if (this.phase !== 'PLAYING' || this.turn?.player !== 'P2') return
    const input = {
      cells: this.cells,
      shieldOwners: this.shieldOwners,
      me: 'P2' as const,
      deck: this.deckOf('P2'),
      silenced: this.player('P2').silenced,
      random: this.random,
    }
    const action = chooseBotAction(input)
    if (action?.kind === 'ABILITY') {
      if (this.useAbility('P2', action.ability, action.targetCell)) return
      const fallback = chooseBotAction({ ...input, abilityChance: 0 })
      if (fallback?.kind === 'MOVE') this.move('P2', fallback.cell)
      return
    }
    if (action) this.move('P2', action.cell)
  }

  private isTurnOf(slot: PlayerSlot): boolean {
    if (this.phase === 'PLAYING' && this.turn?.player === slot) return true
    this.error(slot, 'NOT_YOUR_TURN', 'Não é a sua vez.')
    return false
  }

  private move(slot: PlayerSlot, cell: number) {
    if (!this.isTurnOf(slot)) return
    if (!Number.isInteger(cell) || cell < 0 || cell >= this.cells.length) {
      return this.error(slot, 'INVALID_CELL', 'Casa inválida.')
    }
    if (this.cells[cell].owner !== null) {
      return this.error(slot, 'CELL_TAKEN', 'Essa casa já está ocupada.')
    }
    if (isBlockedFor(this.cells, this.shieldOwners, cell, slot)) {
      return this.error(slot, 'CELL_SHIELDED', 'Essa casa está protegida por um Escudo.')
    }
    this.cells = this.cells.map((c) => (c.index === cell ? { ...c, owner: slot } : c))
    this.player(slot).consecutiveTimeouts = 0
    this.emit('BOARD_UPDATE', { board: this.cells })
    this.endTurn(slot)
  }

  /** true se a habilidade foi aceita (mesmo anulada ou sem efeito) */
  private useAbility(
    slot: PlayerSlot,
    ability: AbilityId,
    targetCell?: number,
    destinationCell?: number,
  ): boolean {
    if (!this.isTurnOf(slot)) return false
    const p = this.player(slot)
    const opponent = this.player(otherSlot(slot))
    if (p.silenced) {
      this.error(slot, 'SILENCED', 'Você está silenciado: não pode usar habilidades neste turno.')
      return false
    }
    if (!this.deckOf(slot).some((d) => d.ability === ability && !d.usedThisRound)) {
      this.error(slot, 'ABILITY_UNAVAILABLE', 'Essa habilidade não está disponível.')
      return false
    }

    const result = resolveAbility({
      cells: this.cells,
      shieldOwners: this.shieldOwners,
      actor: slot,
      ability,
      targetCell,
      destinationCell,
      opponentForceField: opponent.forceFieldTurnsLeft,
      random: this.random,
    })
    if (!result.ok) {
      this.error(slot, result.code, result.message)
      return false
    }

    p.used.add(ability) // uma vez por round e consome o turno [RN-ARN-02]
    p.consecutiveTimeouts = 0
    this.cells = result.cells
    this.shieldOwners = result.shieldOwners
    if (result.absorbed) opponent.forceFieldTurnsLeft = 0
    if (result.hourglassFor) this.hourglassFor = result.hourglassFor
    if (result.silence) opponent.silenced = true
    if (result.forceFieldFor) p.forceFieldTurnsLeft = EFFECT_DURATION_TURNS

    this.emit('ABILITY_RESOLVED', {
      by: slot,
      ability,
      targetCell: result.targetCell,
      destinationCell: result.destinationCell,
      absorbed: result.absorbed,
      noEffect: result.noEffect,
    })
    this.emit('BOARD_UPDATE', { board: this.cells })
    this.emit('DECK_UPDATE', { deck: this.deckOf(slot) }, slot)
    this.endTurn(slot)
    return true
  }

  private timeout(slot: PlayerSlot) {
    if (this.phase !== 'PLAYING' || this.turn?.player !== slot) return
    this.turnTimer = null
    const p = this.player(slot)
    p.consecutiveTimeouts += 1
    this.emit('TURN_TIMEOUT', { player: slot, consecutiveTimeouts: p.consecutiveTimeouts })
    if (p.consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
      return this.endMatch({ kind: 'WO', winner: otherSlot(slot) }) // [RN-ARN-01]
    }
    this.endTurn(slot) // turno perdido também conta como turno [RN-ARN-07]
  }

  /**
   * Fim de cada ação: verifica quem agiu e depois o oponente, e só então os contadores dos
   * efeitos caem [RN-ARN-08] [RN-ARN-07]
   */
  private endTurn(actor: PlayerSlot) {
    this.cancel(this.turnTimer)
    this.turnTimer = null

    const result = evaluateBoard(this.cells, actor)
    if (result)
      return this.endRound(
        result.kind === 'WIN' ? result.winner : null,
        result.kind === 'WIN' ? result.line : null,
      )

    const ticked = tickEffects(this.cells, this.shieldOwners)
    this.cells = ticked.cells
    this.shieldOwners = ticked.shieldOwners
    for (const slot of ['P1', 'P2'] as const) {
      const p = this.player(slot)
      p.forceFieldTurnsLeft = Math.max(0, p.forceFieldTurnsLeft - 1)
    }
    this.player(actor).silenced = false // o Silêncio vale só para o próximo turno dele
    this.emit('BOARD_UPDATE', { board: this.cells })
    this.startTurn(otherSlot(actor))
  }

  private endRound(winner: RoundResult, winningLine: number[] | null) {
    this.cancel(this.turnTimer)
    this.turn = null
    this.results.push(winner)
    const score = scoreOf(this.results)
    this.player('P1').roundsWon = score.P1
    this.player('P2').roundsWon = score.P2
    this.emit('ROUND_END', { round: this.round, winner, winningLine, score })
    this.setPhase('ROUND_END')

    const status = matchStatus(this.results)
    this.later(MOCK_TIMINGS.roundEnd, () =>
      status.over ? this.endMatch(status.outcome) : this.startRound(),
    )
  }

  private endMatch(outcome: MatchOutcome) {
    this.cancel(this.turnTimer)
    this.turn = null
    this.emit('MATCH_END', {
      outcome,
      coins: { P1: coinsFor(outcome, 'P1'), P2: coinsFor(outcome, 'P2') },
    })
    this.setPhase('RESULT')

    if (this.botRematch === 'pede') {
      this.later(MOCK_TIMINGS.botRematch, () => this.requestRematch('P2'))
    } else if (this.botRematch === 'sai') {
      this.later(MOCK_TIMINGS.botRematch, () => this.leave('P2'))
    }
  }

  // ---------------------------------------------------------------- revanche e saída

  private requestRematch(slot: PlayerSlot) {
    if (this.phase !== 'RESULT') {
      return this.error(slot, 'WRONG_PHASE', 'A revanche só pode ser pedida no Resultado.')
    }
    // Os dois pediram: vale como aceite
    if (this.rematch?.by === otherSlot(slot)) return this.respondRematch(slot, true)
    if (this.rematch) return this.error(slot, 'REMATCH_PENDING', 'Você já pediu revanche.')

    this.rematch = {
      by: slot,
      timer: this.later(REMATCH_WINDOW_SECONDS * 1000, () => this.cancelRematch('TIMEOUT')),
    }
    this.emit('REMATCH_REQUESTED', {
      by: slot,
      deadline: Date.now() + REMATCH_WINDOW_SECONDS * 1000,
    })

    if (slot === 'P1' && (this.botRematch === 'aceita' || this.botRematch === 'recusa')) {
      const accept = this.botRematch === 'aceita'
      this.later(MOCK_TIMINGS.rematchAccept, () => this.respondRematch('P2', accept))
    }
  }

  private respondRematch(slot: PlayerSlot, accept: boolean) {
    if (this.phase !== 'RESULT' || !this.rematch || this.rematch.by === slot) {
      return this.error(slot, 'NO_REMATCH', 'Não há pedido de revanche para responder.')
    }
    if (!accept) return this.cancelRematch('DECLINED')
    this.cancel(this.rematch.timer)
    // Aceita pelos dois: a sala é mantida e tudo recomeça na Preparação [RN-POS-03]
    this.startDraft()
  }

  /** Pedido cancelado: a sala é encerrada e quem pediu volta ao Hub [RN-POS-02] */
  private cancelRematch(reason: keyof typeof ROOM_CLOSED_REASON) {
    if (!this.rematch) return
    this.cancel(this.rematch.timer)
    this.rematch = null
    this.emit('REMATCH_CANCELLED', { reason })
    this.closeRoom(ROOM_CLOSED_REASON[reason])
  }

  /** Voltar ao Lobby (ou fechar o app): encerra a sala e avisa o outro na hora */
  private leave(slot: PlayerSlot) {
    if (this.rematch) {
      this.cancel(this.rematch.timer)
      this.rematch = null
      this.emit('REMATCH_CANCELLED', { reason: 'LEFT' })
    }
    this.emit('PLAYER_LEFT', { slot })
    this.closeRoom(slot === 'P1' ? 'Você saiu da sala.' : ROOM_CLOSED_REASON.LEFT)
    if (slot === 'P1') this.stop()
  }

  private closeRoom(reason: string) {
    this.closed = true
    this.timers.forEach(clearTimeout)
    this.timers.clear()
    this.emit('ROOM_CLOSED', { reason })
  }
}
