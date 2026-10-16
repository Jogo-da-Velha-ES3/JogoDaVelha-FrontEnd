// Valores fixos do jogo, conforme a ERS MVP 1 — V2. Nada de "número mágico" fora daqui.

export const BOARD_SIZE = 4
export const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE
export const WIN_LENGTH = 4
export const ROOM_CODE_LENGTH = 4 // numérico [RF-SAL-01]
export const MAX_PLAYERS_PER_ROOM = 2 // [RN-SAL-01]

export const TURN_DURATION_SECONDS = 10 // [RF-ARN-02]
export const SUDDEN_DEATH_TURN_DURATION_SECONDS = 5
export const HOURGLASS_TURN_DURATION_SECONDS = 5 // Ampulheta
export const MAX_CONSECUTIVE_TIMEOUTS = 3 // W.O. [RN-ARN-01]
export const PREPARATION_SECONDS = 20 // [RF-DRAFT-01]
export const DRAW_PICK_SECONDS = 8 // [RN-DRAFT-05]
export const MATCH_FOUND_COUNTDOWN_SECONDS = 3 // [RF-SAL-03]
export const REMATCH_WINDOW_SECONDS = 15 // [RN-POS-01]
export const EFFECT_DURATION_TURNS = 2 // Escudo, Congelar, Campo de Força, Reforço [RN-ARN-07]
// No W.O., a Arena segura o banner antes de ir para o Resultado (PROJECT_CONTEXT §9, 16/10)
export const WO_RESULT_DELAY_SECONDS = 2
/** Banner de início do round (ROUND N, MATCH POINT, MORTE SÚBITA) e, no round 1, a moeda girando */
export const ROUND_BANNER_SECONDS = 2.5
export const ROUND_COIN_FLIP_SECONDS = 1.2

export const INITIAL_ABILITIES_TO_PICK = 2
export const DECK_SIZE = 3 // 2 iniciais + 1 sorteada [RN-DRAFT-02]
export const DRAW_OPTIONS = 3
export const ROUNDS_TO_WIN_MATCH = 2
export const MAX_ROUNDS = 3

export const ABILITIES = [
  'BOMBA',
  'ESCUDO',
  'AMPULHETA',
  'TORNADO',
  'BURACO_NEGRO',
  'CONGELAR',
  'CAMPO_DE_FORCA',
  'SILENCIO',
  'TROCA_RAPIDA',
  'REFORCO',
] as const

export const STARTER_ABILITIES = ['BOMBA', 'ESCUDO', 'AMPULHETA'] as const // [RN-LOJ-01]

export const CHARACTERS = ['X', 'O', 'TRIANGULO', 'QUADRADO', 'ESTRELA', 'CORACAO'] as const
export const STARTER_CHARACTERS = ['X', 'O'] as const // [RN-LOJ-01]

export const STARTING_COINS = 0

// Recompensas por partida [RF-POS-02]
export const COINS_REWARD = {
  WIN: 50,
  DRAW: 20,
  LOSS: 10,
  WO_WIN: 30,
  WO_LOSS: 0,
} as const

// Preço de cada habilidade na Loja (revisão de telas, 06/10). Personagens: ver characters.ts.
// O valor oficial vem do catálogo do back.
export const ABILITY_PRICE = 350

// O Vitão fica fora do MVP 1: só o espaço reservado na Arena.
export const VITAO_ENABLED = false
