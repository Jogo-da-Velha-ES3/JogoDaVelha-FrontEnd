// Mensagens reais do back (contrato V2), capturadas numa partida contra o back local em 06/11/2026
// (docs/LOCAL_INTEGRATION.md). Servem aos testes da tradução: se o back mudar o formato, é aqui que
// a diferença aparece. Os exemplos sem captura (Tornado, round empatado) seguem o contrato.

const emptyBoard = Array.from({ length: 16 }, (_, index) => ({ index, owner: null, effects: [] }))

const players = [
  {
    slot: 'P1',
    userId: 'e852e019-f8eb-43be-bfb1-004fb042b2f4',
    nickname: 'smokehost940349',
    character: null,
    roundsWon: 0,
    consecutiveTimeouts: 0,
    forceFieldTurnsLeft: 0,
    silenced: false,
    connected: true,
  },
  {
    slot: 'P2',
    userId: '717adadb-ca2f-452b-ba67-f6b13b87c239',
    nickname: 'smokeguest16109',
    character: null,
    roundsWon: 0,
    consecutiveTimeouts: 0,
    forceFieldTurnsLeft: 0,
    silenced: false,
    connected: false,
  },
]

const snapshot = (mySlot: 'P1' | null) => ({
  gameId: null,
  code: '1171',
  phase: 'MATCHED',
  players,
  mySlot,
  round: 1,
  suddenDeath: false,
  board: emptyBoard,
  turn: null,
  myDeck: [],
  outcome: null,
  serverTime: 1793935922493,
  draft: null,
  drawOptions: null,
  coins: null,
  rematch: null,
})

const message = (type: string, payload: unknown, serverTime: number) =>
  JSON.stringify({ type, payload, serverTime })

export const BACK_MESSAGES = {
  playerJoined: message(
    'PLAYER_JOINED',
    {
      roomCode: '1171',
      guestId: '717adadb-ca2f-452b-ba67-f6b13b87c239',
      opponentName: 'smokeguest16109',
      guestAvatar: 'DEFAULT',
      hostId: 'e852e019-f8eb-43be-bfb1-004fb042b2f4',
      hostUsername: 'smokehost940349',
      hostAvatar: 'DEFAULT',
    },
    1793935922484,
  ),
  /** Na fila privada: completo, com `mySlot` */
  privateSnapshot: message('ROOM_SNAPSHOT', snapshot('P1'), 1793935922493),
  /** No tópico da sala: o mesmo, sem `mySlot` e sem deck */
  publicSnapshot: message('ROOM_SNAPSHOT', snapshot(null), 1793935922493),
  draftUpdate: message(
    'DRAFT_UPDATE',
    {
      deadline: 1793935945517,
      characters: { P1: 'X' },
      ready: { P1: false, P2: false },
      nicknames: { P1: 'smokehost940349' },
      version: 1,
    },
    1793935925580,
  ),
  roundStart: message(
    'ROUND_START',
    { round: 1, suddenDeath: false, firstPlayer: 'P1' },
    1793935928747,
  ),
  turnStart: message(
    'TURN_START',
    {
      player: 'P1',
      startedAt: 1793935931317,
      durationSeconds: 10,
      consecutiveTimeouts: { P1: 0, P2: 0 },
      silenced: { P1: false, P2: false },
    },
    1793935931332,
  ),
  /** Habilidade sem alvo: sem `targetPosition` nem `destinationPosition` */
  abilityHourglass: message(
    'ABILITY_RESOLVED',
    { by: 'P1', skillCode: 'AMPULHETA', absorbed: false, noEffect: false },
    1793935936551,
  ),
  abilityTornado: message(
    'ABILITY_RESOLVED',
    {
      by: 'P2',
      skillCode: 'TORNADO',
      targetPosition: 5,
      destinationPosition: 10,
      absorbed: false,
      noEffect: false,
    },
    1793102400000,
  ),
  roundEndWin: message(
    'ROUND_END',
    { round: 1, winner: 'P1', winningLine: [0, 1, 2, 3], score: { P1: 1, P2: 0 } },
    1793935931428,
  ),
  /** Round empatado: `winner` null e sem `winningLine` */
  roundEndDraw: message(
    'ROUND_END',
    { round: 1, winner: null, score: { P1: 0, P2: 0 } },
    1793102410000,
  ),
  matchEnd: message(
    'MATCH_END',
    {
      outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] },
      coins: { P1: 50, P2: 10 },
      reason: 'NORMAL',
      forfeit: false,
    },
    1793935939160,
  ),
  roomClosed: message(
    'ROOM_CLOSED',
    {
      roomCode: '0689',
      closedBy: '6204e695-fa85-4d02-9aae-b95373b2eac7',
      reason: 'PLAYER_LEFT',
    },
    1793935996201,
  ),
  /** Erro de uma ação, na fila de erros: formato do REST, sem envelope */
  error: JSON.stringify({
    code: 'ROOM_NOT_FOUND',
    message: 'Sala não encontrada ou encerrada.',
    status: 404,
    timestamp: '2026-11-06T03:33:16.211274Z',
    path: '/app/rooms/0689/draft/abilities',
  }),
} as const
