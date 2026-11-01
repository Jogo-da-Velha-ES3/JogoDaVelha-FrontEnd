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
/** Preparação: a partir daqui avisa o que falta e leva às habilidades (decisão de 17/10) */
export const PREPARATION_WARN_SECONDS = 8
/** Preparação: espera depois de o servidor confirmar o personagem antes de ir às habilidades */
export const PREPARATION_AUTO_ADVANCE_MS = 500
export const DRAW_PICK_SECONDS = 8 // [RN-DRAFT-05]
export const MATCH_FOUND_COUNTDOWN_SECONDS = 3 // [RF-SAL-03]
export const REMATCH_WINDOW_SECONDS = 15 // [RN-POS-01]
export const EFFECT_DURATION_TURNS = 2 // Escudo, Congelar, Campo de Força, Reforço [RN-ARN-07]
// No W.O. e no empate absoluto, a Arena segura o banner antes de ir para o Resultado
// (PROJECT_CONTEXT §9: W.O. em 16/10, empate absoluto em 17/10)
export const RESULT_HOLD_SECONDS = 2
/**
 * Comemoração do Resultado (FE-15): a rajada de partículas dura até este tempo e some. O número
 * de partículas é por tipo de vitória: impecável (2×0), comum e por W.O. (versão curta).
 */
export const RESULT_BURST_SECONDS = 3
export const RESULT_BURST_PARTICLES = { flawless: 32, win: 20, short: 10 } as const
/** Duração da contagem dos Coins no Resultado (FE-15), de 0 até o valor que o servidor creditou */
export const COINS_COUNT_SECONDS = 1.2
/** Entrada da Morte Súbita: flash, tremor, fitas de perigo e o banner (FE-13) */
export const SUDDEN_DEATH_ENTRY_SECONDS = 2.2
/** Banner de início do round (ROUND N, MATCH POINT, MORTE SÚBITA) e, no round 1, a moeda girando */
export const ROUND_BANNER_SECONDS = 2.5
export const ROUND_COIN_FLIP_SECONDS = 1.2
/**
 * Apresentação do round: depois do sorteio da 3ª habilidade, o servidor espera este tempo antes do
 * primeiro TURN_START. Cabe o banner de início do round e a entrada da Morte Súbita
 * [A VALIDAR COM O BACK]
 */
export const ROUND_INTRO_SECONDS = 2.5
/** Habilidade resolvida (FE-27): o efeito na casa e o aviso ("Oponente usou…", "Anulada…") */
export const ABILITY_IMPACT_SECONDS = 1
export const ABILITY_NOTICE_SECONDS = 2.5

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

// O Vitão (FE-41 a FE-45) foi ligado em 31/10, com a FE-44. Com `false`, só o espaço dele fica na
// Arena (PROJECT_CONTEXT §9).
export const VITAO_ENABLED = true
/** Vitão: no máximo 1 fala a cada tantos segundos, menos nos momentos grandes (FE-44) */
export const VITAO_COOLDOWN_SECONDS = 6
/**
 * Vitão: chance de comentar uma jogada de peça (1 em 3). Habilidades, estouros e momentos grandes
 * ele sempre comenta
 */
export const VITAO_MOVE_COMMENT_CHANCE = 1 / 3
/** Vitão: quanto tempo o balão fica na tela */
export const VITAO_BUBBLE_SECONDS = 4
/** Vitão: janela para reunir eventos que chegam juntos e escolher o de maior prioridade */
export const VITAO_DECISION_WINDOW_MS = 500
