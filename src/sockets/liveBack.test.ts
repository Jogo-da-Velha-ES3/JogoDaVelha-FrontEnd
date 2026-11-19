// @vitest-environment node
// Integração com o back de verdade (opcional). O P1 é o front inteiro (gameClient, cliente STOMP,
// tradução e stores); o P2 é um cliente STOMP simples, que joga sozinho. O REST de perfil, loja e
// Coins tem o seu em src/api/liveBack.test.ts (FE-49). Fica pulado sem
// VITE_LIVE_BACK_URL, então não roda no `npm test` nem no CI. Roda no ambiente node: o WebSocket
// do jsdom manda a origem localhost:3000, que o back recusa (CORS_ALLOWED_ORIGINS).
//
// Com o back rodando na máquina (docs/LOCAL_INTEGRATION.md):
//   VITE_LIVE_BACK_URL=http://localhost:8080 npx vitest run src/sockets/liveBack.test.ts
import { Client, type IMessage } from '@stomp/stompjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBoardStore } from '../stores/boardStore'
import { useDraftStore } from '../stores/draftStore'
import { useMatchStore } from '../stores/matchStore'
import { usePowersStore } from '../stores/powersStore'
import { useRoomStore } from '../stores/roomStore'
import { useTimerStore } from '../stores/timerStore'
import type { AbilityId, RoomPhase } from '../types/game'
import { joinRoom, leaveRoom, onServerEventForDebug, sendCommand } from './gameClient'
import { RenewingConnection } from './renewingConnection'
import { StompConnection, toBrokerUrl } from './stompConnection'

const BASE = import.meta.env.VITE_LIVE_BACK_URL
const MATCH_TIMEOUT = 90_000

interface Account {
  username: string
  token: string
}

async function rest<T>(method: string, path: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${text}`)
  return (text ? JSON.parse(text) : null) as T
}

async function account(name: string): Promise<Account> {
  const username = `${name}${Math.floor(Math.random() * 1e6)}`.slice(0, 15)
  await rest('POST', '/auth/register', undefined, {
    username,
    password: 'senha123',
    email: `${username}@teste.com`,
  })
  const { token } = await rest<{ token: string }>('POST', '/auth/login', undefined, {
    identifier: username,
    password: 'senha123',
  })
  return { username, token }
}

/** Últimos eventos que chegaram ao front, para explicar uma espera que não acabou */
const recent: string[] = []

/** Espera a condição (com timers reais), checando a cada 50ms */
async function until(condition: () => boolean, label: string, timeoutMs = MATCH_TIMEOUT - 10_000) {
  const started = Date.now()
  while (!condition()) {
    if (Date.now() - started > timeoutMs) {
      const { phase, lastError, connection } = useRoomStore.getState()
      throw new Error(
        `Esperou demais: ${label}. Fase ${phase}, conexão ${connection}, último erro ` +
          `${JSON.stringify(lastError)}. Últimos eventos: ${recent.slice(-12).join(' | ')}`,
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

/**
 * O front como P1: reage às stores e só manda intenções, como as telas. Na vez dele, joga e passa a
 * vez; no round da habilidade, usa a habilidade e depois joga, e a jogada fecha o turno (BE-046).
 * Com `turns: false`, só faz a Preparação e o sorteio (o teste joga os turnos)
 */
function driveP1(options: { ability?: { round: number; id: AbilityId }; turns?: boolean } = {}) {
  const line = [0, 1, 2, 3]
  const sent = {
    character: false,
    abilities: false,
    pickRound: 0,
    turn: 0,
    abilityUsed: false,
    abilityThisTurn: false,
    moved: false,
    ended: false,
  }
  const timer = setInterval(() => {
    const room = useRoomStore.getState()
    const match = useMatchStore.getState()
    const draft = useDraftStore.getState()
    if (room.phase === 'DRAFT' && !sent.character) {
      sent.character = true
      sendCommand({ type: 'DRAFT_CHARACTER', payload: { character: 'X' } })
    }
    if (draft.characters.P1 === 'X' && !sent.abilities) {
      sent.abilities = true
      sendCommand({ type: 'DRAFT_ABILITIES', payload: { abilities: ['ESCUDO', 'AMPULHETA'] } })
    }
    const options_ = usePowersStore.getState().drawOptions
    if (options_ && sent.pickRound !== match.round) {
      sent.pickRound = match.round
      // Do round 2 em diante o deck está completo e o back exige a carta que sai (FE-50): sai a
      // sorteada, e as iniciais (a Ampulheta do teste) ficam
      const drawn = usePowersStore.getState().deck.find((slot) => slot.source === 'DRAWN')
      sendCommand({
        type: 'DRAW_PICK',
        payload: drawn
          ? { ability: options_.options[0], abilityToRemove: drawn.ability }
          : { ability: options_.options[0] },
      })
    }
    const { turn, actions } = useTimerStore.getState()
    if (options.turns === false || room.phase !== 'PLAYING' || turn?.player !== room.mySlot) return
    if (turn.startedAt !== sent.turn) {
      sent.turn = turn.startedAt
      sent.abilityThisTurn = false
      sent.moved = false
      sent.ended = false
    }
    if (options.ability?.round === match.round && !sent.abilityUsed) {
      sent.abilityUsed = true
      sent.abilityThisTurn = true
      sendCommand({ type: 'USE_ABILITY', payload: { ability: options.ability.id } })
      return
    }
    // Com a habilidade no turno, a jogada espera a confirmação dela e fecha o turno sozinha
    if (!sent.moved && (!sent.abilityThisTurn || actions.abilityUsed)) {
      sent.moved = true
      const cells = useBoardStore.getState().cells
      const cell = line.find((index) => cells[index]?.owner !== 'P1')
      if (cell !== undefined) sendCommand({ type: 'MOVE', payload: { cell } })
      return
    }
    // Só jogou: passa a vez em vez de esperar o prazo
    if (actions.moveUsed && !actions.abilityUsed && !sent.ended) {
      sent.ended = true
      sendCommand({ type: 'END_TURN', payload: {} })
    }
  }, 50)
  return () => clearInterval(timer)
}

interface BackMessage {
  type?: string
  payload?: Record<string, unknown>
  code?: string
}

/** O P2: um cliente STOMP simples que joga casas que nunca fecham linha e passa a vez */
function botP2(code: string, guest: Account, mode: 'play' | 'leave-in-draft') {
  const received: BackMessage[] = []
  const cells = [4, 5, 6, 8, 9, 12, 13]
  let board: { owner: string | null }[] = []
  let deck: { ability: string; source: string }[] = []
  let sentCharacter = false
  let sentAbilities = false
  let endedTurn = false
  const client = new Client({
    brokerURL: toBrokerUrl(BASE ?? ''),
    connectHeaders: { Authorization: `Bearer ${guest.token}` },
    reconnectDelay: 0,
  })
  const send = (path: string, body: object = {}) =>
    client.publish({ destination: `/app/rooms/${code}${path}`, body: JSON.stringify(body) })
  const onMessage = (message: IMessage) => {
    const data = JSON.parse(message.body) as BackMessage
    received.push(data)
    const payload = data.payload ?? {}
    const inDraft =
      (data.type === 'PHASE_CHANGE' && payload.phase === 'DRAFT') ||
      (data.type === 'ROOM_SNAPSHOT' && payload.mySlot === 'P2' && payload.phase === 'DRAFT')
    if (inDraft && !sentCharacter) {
      sentCharacter = true
      if (mode === 'leave-in-draft') return send('/leave')
      send('/draft/character', { character: 'O' })
    }
    const characters = payload.characters as Record<string, string> | undefined
    if (data.type === 'DRAFT_UPDATE' && characters?.P2 === 'O' && !sentAbilities) {
      sentAbilities = true
      send('/draft/abilities', { abilities: ['BOMBA', 'ESCUDO'] })
    }
    if (data.type === 'DECK_UPDATE') deck = payload.deck as typeof deck
    if (data.type === 'DRAW_OPTIONS') {
      // Do round 2 em diante, sai a sorteada do round anterior (o back exige `abilityToRemove`)
      const drawn = deck.find((slot) => slot.source === 'DRAWN')?.ability
      send('/draw/pick', { ability: (payload.options as string[])[0], abilityToRemove: drawn })
    }
    if (data.type === 'BOARD_UPDATE') {
      board = payload.board as typeof board
      // Depois da própria jogada, com a vez ainda dele, passa a vez (BE-046). Espera o BOARD_UPDATE:
      // mandar junto com a jogada pode chegar ao back antes dela
      const turn = payload.turn as { player?: string; actions?: { moveUsed?: boolean } } | undefined
      if (turn?.player === 'P2' && turn.actions?.moveUsed && !endedTurn) {
        endedTurn = true
        send('/end-turn')
      }
    }
    if (data.type === 'TURN_START' && payload.player === 'P2') {
      endedTurn = false
      send('/move', { position: cells.find((index) => !board[index]?.owner) })
    }
  }
  client.onConnect = () => {
    client.subscribe(`/topic/rooms/${code}`, onMessage)
    client.subscribe('/user/queue/room', onMessage)
    client.subscribe('/user/queue/errors', onMessage)
    send('/connect')
  }
  client.activate()
  return { received, stop: () => client.deactivate() }
}

/** Cria a sala como P1 (pelo front) e põe o P2 nela */
async function startRoom(mode: 'play' | 'leave-in-draft') {
  const [host, guest] = await Promise.all([account('livehost'), account('liveguest')])
  const { code } = await rest<{ code: string }>('POST', '/rooms', host.token)
  const connection = new StompConnection({
    brokerURL: toBrokerUrl(BASE ?? ''),
    getToken: () => host.token,
  })
  const phases: RoomPhase[] = []
  const unsubscribe = useRoomStore.subscribe((state) => {
    if (state.phase && phases.at(-1) !== state.phase) phases.push(state.phase)
  })
  const stopLog = onServerEventForDebug((event) => {
    recent.push(`${event.type} ${JSON.stringify(event.payload).slice(0, 80)}`)
  })
  await joinRoom(code, { connection })
  await until(() => useRoomStore.getState().mySlot === 'P1', 'snapshot do P1')
  await rest('POST', `/rooms/${code}/join`, guest.token)
  const p2 = botP2(code, guest, mode)
  return {
    code,
    host,
    guest,
    connection,
    phases,
    p2,
    cleanup: () => (unsubscribe(), stopLog(), p2.stop()),
  }
}

/** localStorage em memória: o ambiente node não tem, e o token do login fica nele */
function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  }
}

describe.skipIf(!BASE)('front contra o back de verdade (FE-18, FE-19, FE-20, FE-49)', () => {
  let cleanups: (() => void)[] = []
  afterEach(() => {
    cleanups.forEach((cleanup) => cleanup())
    cleanups = []
    leaveRoom()
  })

  it(
    'partida inteira: Preparação, sorteio, habilidade, 2×0 e o Resultado',
    async () => {
      const room = await startRoom('play')
      // Como o profileStore: no MATCH_END o front busca o saldo, que já precisa ter os Coins
      let balances: Promise<{ coinsBalance: number }[]> | null = null
      const stopBalances = useMatchStore.subscribe((state, previous) => {
        if (previous.outcome !== null || state.outcome === null) return
        balances = Promise.all(
          [room.host, room.guest].map((player) =>
            rest<{ coinsBalance: number }>('GET', '/coins/balance', player.token),
          ),
        )
      })
      cleanups.push(stopBalances)
      let usedAbility = false
      const stopDeck = usePowersStore.subscribe((state) => {
        if (state.deck.some((slot) => slot.ability === 'AMPULHETA' && slot.usedThisRound)) {
          usedAbility = true
        }
      })
      cleanups.push(room.cleanup, stopDeck, driveP1({ ability: { round: 2, id: 'AMPULHETA' } }))

      // Sala lotada: o terceiro é recusado com um código que o front traduz (src/api/rooms.ts). Com
      // dois jogadores a sala já saiu da espera, e o back responde ROOM_ALREADY_STARTED
      const third = await account('livethird')
      await expect(rest('POST', `/rooms/${room.code}/join`, third.token)).rejects.toThrow(
        /ROOM_FULL|ROOM_ALREADY_STARTED/,
      )

      // Jogada fora de hora (durante o sorteio): o servidor recusa e nada muda no tabuleiro
      await until(() => useRoomStore.getState().phase === 'ROUND_DRAW', 'sorteio do round 1')
      sendCommand({ type: 'MOVE', payload: { cell: 15 } })
      await until(() => useRoomStore.getState().lastError !== null, 'erro da jogada fora de hora')
      expect(useBoardStore.getState().cells.every((cell) => cell.owner === null)).toBe(true)

      await until(() => useMatchStore.getState().outcome !== null, 'fim da partida')
      // O snapshot que o back manda depois do MATCH_END não pode apagar a hora do resultado
      await until(() => useRoomStore.getState().phase === 'RESULT', 'fase RESULT')
      await new Promise((resolve) => setTimeout(resolve, 500))

      const match = useMatchStore.getState()
      // O snapshot final traz também o `reason` (NORMAL ou FORFEIT_TIMEOUT)
      expect(match.outcome).toMatchObject({ kind: 'WIN', winner: 'P1', score: [2, 0] })
      expect(match.score).toEqual({ P1: 2, P2: 0 })
      expect(match.coins).toEqual({ P1: 50, P2: 10 })
      // Contas novas (0 Coins): o saldo pedido no MATCH_END já veio com o crédito da partida
      expect(balances).not.toBeNull()
      expect((await balances!).map((b) => b.coinsBalance)).toEqual([50, 10])
      expect(match.outcomeReceivedAt).not.toBeNull()
      expect(usedAbility).toBe(true)
      expect(room.phases).toEqual(
        expect.arrayContaining(['MATCHED', 'DRAFT', 'VERSUS', 'ROUND_DRAW', 'PLAYING', 'RESULT']),
      )
      const opponent = useRoomStore.getState().players.find((p) => p.slot === 'P2')
      expect(opponent?.nickname).toBe(room.guest.username)

      // Voltar ao Lobby no Resultado: o P2 vê a sala encerrada
      leaveRoom()
      await until(
        () =>
          room.p2.received.some(
            (m) => m.type === 'ROOM_CLOSED' && m.payload?.reason === 'RETURN_TO_LOBBY',
          ),
        'ROOM_CLOSED para o P2',
        5000,
      )
    },
    MATCH_TIMEOUT,
  )

  it(
    'jogada e habilidade no mesmo turno, Passar a vez e o prazo depois de uma ação (BE-046)',
    async () => {
      const room = await startRoom('play')
      cleanups.push(room.cleanup, driveP1({ turns: false }))
      const timer = () => useTimerStore.getState()
      const myTurn = () =>
        useRoomStore.getState().phase === 'PLAYING' && timer().turn?.player === 'P1'
      /**
       * Espera um turno meu novo. O robô joga e passa a vez em poucos milissegundos, então o turno
       * dele pode passar entre duas checagens: o sinal é o início do meu turno mudar
       */
      const nextTurn = async (label: string) => {
        const before = timer().turn?.startedAt
        await until(
          () => myTurn() && timer().turn?.startedAt !== before,
          `minha vez (${label})`,
          25_000,
        )
      }
      /** Manda a intenção e espera o erro dela */
      const refused = async (command: Parameters<typeof sendCommand>[0]) => {
        const before = useRoomStore.getState().lastError
        sendCommand(command)
        await until(() => useRoomStore.getState().lastError !== before, `erro de ${command.type}`)
        return useRoomStore.getState().lastError
      }
      await until(myTurn, 'minha primeira vez', 40_000)

      // Jogada: o turno continua comigo, e uma segunda jogada é recusada
      const startedAt = timer().turn?.startedAt
      sendCommand({ type: 'MOVE', payload: { cell: 0 } })
      await until(() => timer().actions.moveUsed, 'jogada confirmada')
      expect(timer().turn).toMatchObject({ player: 'P1', startedAt })
      expect(await refused({ type: 'MOVE', payload: { cell: 1 } })).toMatchObject({
        code: 'MOVE_ALREADY_USED',
        command: 'MOVE',
      })
      // Passar a vez fecha o turno sem estouro
      sendCommand({ type: 'END_TURN', payload: {} })
      await nextTurn('depois de passar a vez')
      expect(useMatchStore.getState().lastTimeout).toBeNull()

      // Sem ação, passar a vez é recusado; habilidade e jogada no mesmo turno fecham o turno sozinhas
      expect(await refused({ type: 'END_TURN', payload: {} })).toMatchObject({
        code: 'END_TURN_WITHOUT_ACTION',
        command: 'END_TURN',
      })
      sendCommand({ type: 'USE_ABILITY', payload: { ability: 'AMPULHETA' } })
      await until(() => timer().actions.abilityUsed, 'habilidade confirmada')
      expect(timer().turn?.player).toBe('P1')
      expect(
        await refused({ type: 'USE_ABILITY', payload: { ability: 'ESCUDO', targetCell: 15 } }),
      ).toMatchObject({ code: 'SKILL_ACTION_ALREADY_USED', command: 'USE_ABILITY' })
      sendCommand({ type: 'MOVE', payload: { cell: 1 } })
      await nextTurn('depois da habilidade e da jogada')

      // Joga e deixa o prazo acabar: o turno passa sem estouro (o TURN_TIMEOUT com 0 é descartado)
      sendCommand({ type: 'MOVE', payload: { cell: 2 } })
      await until(() => timer().actions.moveUsed, 'terceira jogada confirmada')
      await nextTurn('prazo depois da jogada')
      expect(useMatchStore.getState().lastTimeout).toBeNull()
      expect(useMatchStore.getState().consecutiveTimeouts.P1).toBe(0)
      expect(useBoardStore.getState().cells.filter((c) => c.owner === 'P1')).toHaveLength(3)
    },
    MATCH_TIMEOUT,
  )

  it(
    'sair na Preparação encerra a sala para quem ficou',
    async () => {
      const room = await startRoom('leave-in-draft')
      cleanups.push(room.cleanup)
      await until(() => useRoomStore.getState().closedReason !== null, 'sala encerrada', 15_000)
      expect(useRoomStore.getState().closedReason).toBe('PLAYER_LEFT')
    },
    MATCH_TIMEOUT,
  )

  it(
    'queda e volta no meio da partida: o snapshot remonta tudo e a partida segue (FE-20)',
    async () => {
      const room = await startRoom('play')
      const statuses: string[] = []
      const stopStatus = useRoomStore.subscribe((state) => {
        if (statuses.at(-1) !== state.connection) statuses.push(state.connection)
      })
      cleanups.push(room.cleanup, stopStatus, driveP1())

      await until(() => useBoardStore.getState().cells.some((c) => c.owner === 'P1'), '1ª jogada')
      // Derruba o WebSocket do P1, como uma queda de rede; o stompjs reconecta sozinho
      const client = (room.connection as unknown as { client: Client }).client
      client.forceDisconnect()

      await until(() => statuses.includes('RECONNECTING'), 'reconectando', 10_000)
      await until(() => useRoomStore.getState().connection === 'CONNECTED', 'reconectado', 15_000)
      expect(useRoomStore.getState().mySlot).toBe('P1')

      // Recarregar a página entre rounds: a conexão some sem mandar LEAVE e uma nova entra na
      // sala, que volta pelo snapshot
      await until(() => useRoomStore.getState().phase === 'ROUND_END', 'fim do round 1')
      room.connection.disconnect()
      const reloaded = new StompConnection({
        brokerURL: toBrokerUrl(BASE ?? ''),
        getToken: () => room.host.token,
      })
      await joinRoom(room.code, { connection: reloaded })
      await until(() => useRoomStore.getState().mySlot === 'P1', 'snapshot depois de recarregar')
      expect(useMatchStore.getState().score.P1).toBe(1)

      await until(() => useMatchStore.getState().outcome !== null, 'fim da partida')
      expect(useMatchStore.getState().outcome).toMatchObject({ kind: 'WIN', winner: 'P1' })
    },
    MATCH_TIMEOUT,
  )

  it(
    'renovação preventiva: a conexão nova assume sem derrubar a presença do jogador',
    async () => {
      // P1 entra pelo RenewingConnection com limites curtos: a renovação dispara no lobby (WAITING)
      const [host, guest] = await Promise.all([account('liverenewh'), account('liverenewg')])
      const { code } = await rest<{ code: string }>('POST', '/rooms', host.token)
      const timeline: string[] = []
      let connections = 0
      const renewing = new RenewingConnection({
        renewAfterMs: 400,
        forceRenewAfterMs: 10_000,
        snapshotTimeoutMs: 15_000,
        checkIntervalMs: 100,
        retryBaseMs: 500,
        createConnection: () => {
          connections += 1
          const id = connections
          const connection = new StompConnection({
            brokerURL: toBrokerUrl(BASE ?? ''),
            getToken: () => host.token,
          })
          const disconnect = connection.disconnect.bind(connection)
          connection.disconnect = () => {
            timeline.push(`dc${id}`)
            disconnect()
          }
          timeline.push(`c${id}`)
          return connection
        },
      })
      const stopLog = onServerEventForDebug((event) => {
        recent.push(`${event.type} ${JSON.stringify(event.payload).slice(0, 80)}`)
        if (event.type === 'ROOM_SNAPSHOT') timeline.push('snap')
      })
      cleanups.push(stopLog)
      await joinRoom(code, { connection: renewing })
      cleanups.push(() => renewing.disconnect())
      await until(() => useRoomStore.getState().mySlot === 'P1', 'snapshot do P1')
      await rest('POST', `/rooms/${code}/join`, guest.token)
      const p2 = botP2(code, guest, 'play')
      cleanups.push(p2.stop)

      // A segunda conexão física sobe enquanto a primeira continua ativa (make-before-break)
      await until(() => connections >= 2, 'segunda conexão STOMP', 15_000)
      // A antiga só cai depois do ROOM_SNAPSHOT que validou a nova
      await until(() => timeline.includes('dc1'), 'conexão antiga desligada', 15_000)
      const created = timeline.indexOf('c2')
      const validated = timeline.findIndex((mark, index) => mark === 'snap' && index > created)
      const retired = timeline.indexOf('dc1')
      expect(validated).toBeGreaterThan(created)
      expect(retired).toBeGreaterThan(validated)
      expect(useRoomStore.getState().connection).toBe('CONNECTED')

      // A sessão antiga caiu, mas a nova do mesmo jogador segue ativa: o back não pode ter
      // publicado PLAYER_DISCONNECTED do P1 (chega só à fila privada do adversário, contrato V2)
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      expect(
        p2.received.filter((m) => m.type === 'PLAYER_DISCONNECTED' && m.payload?.slot === 'P1'),
      ).toHaveLength(0)
    },
    MATCH_TIMEOUT,
  )

  it('token vencido no link direto da sala: o back recusa e a sessão cai (FE-49)', async () => {
    // O front inteiro como nas telas: conexão criada pelo gameClient, token do localStorage
    vi.resetModules()
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
    vi.stubEnv('VITE_API_URL', `${BASE}/api`)
    vi.stubEnv('VITE_WEBSOCKET_URL', BASE ?? '')
    vi.stubGlobal('localStorage', memoryStorage())
    try {
      const [client, { useAuthStore }] = await Promise.all([
        import('./gameClient'),
        import('../stores/authStore'),
      ])
      useAuthStore.getState().login('token.vencido.qualquer')

      // Sem erro de sala para a tela: a sessão caiu e o RequireAuth leva ao Acesso
      await expect(client.joinRoom('4821')).resolves.toBeUndefined()
      expect(useAuthStore.getState().token).toBeNull()
      client.leaveRoom()
    } finally {
      vi.unstubAllEnvs()
      vi.unstubAllGlobals()
    }
  })
})
