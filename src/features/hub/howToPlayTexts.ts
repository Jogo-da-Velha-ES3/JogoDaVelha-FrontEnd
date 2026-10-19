// Textos do modal "Como Jogar" (FE-34). Ficam fora do componente para o grupo de Personalidade
// (FE-40) revisar o tom depois. Fonte das regras: docs/PROJECT_CONTEXT.md. Todo número de regra
// vem de constants/game.ts.
//
// ATENÇÃO: a página "Melhor de 3 e Morte Súbita" segue a regra decidida em 18/10
// (PROJECT_CONTEXT §6), que AINDA É A VALIDAR COM O BACK. Se o back decidir diferente, só essa
// página muda.
//
// A página "Deck e habilidades" é da Parte 3 da FE-34 e continua provisória.

import {
  BOARD_SIZE,
  COINS_REWARD,
  HOURGLASS_TURN_DURATION_SECONDS,
  MAX_CONSECUTIVE_TIMEOUTS,
  MAX_ROUNDS,
  ROUNDS_TO_WIN_MATCH,
  SUDDEN_DEATH_TURN_DURATION_SECONDS,
  TURN_DURATION_SECONDS,
  WIN_LENGTH,
} from '../../constants/game'

/** Subpágina do carrossel interno de uma página (ex: uma habilidade por vez) */
export interface HowToPlaySlide {
  id: string
  title: string
  text: string
}

/** Visual existente da base usado na página, sempre estático */
export type HowToPlayVisual =
  | 'board' // Board com uma linha vencedora
  | 'timeouts' // faixa do jogador com os estouros x/3
  | 'score' // faixas dos dois jogadores com os rounds vencidos
  | 'coins' // moeda dos Coins, uma por linha da tabela

export interface HowToPlayCoinRow {
  label: string
  amount: number
}

export interface HowToPlayPage {
  id: string
  title: string
  visual: HowToPlayVisual
  points: readonly string[]
  /** Carrossel dentro da página; a navegação principal (páginas) não muda por causa dele */
  slides?: readonly HowToPlaySlide[]
  /** Só na página de Coins */
  coinRows?: readonly HowToPlayCoinRow[]
}

export const HOW_TO_PLAY_TEXTS = {
  title: 'Como Jogar',
  close: 'Fechar',
  previous: 'Anterior',
  next: 'Próximo',
  pagesNav: 'Páginas',
  previousSlide: 'Item anterior',
  nextSlide: 'Próximo item',
  /** Nomes das faixas de exemplo (sem relação com jogadores reais) */
  demoSelf: 'Você',
  demoOpponent: 'Oponente',
  pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
  pageLabel: (page: number, total: number, title: string) => `Página ${page} de ${total}: ${title}`,
  slideOf: (slide: number, total: number) => `${slide}/${total}`,
} as const

// Rounds para vencer a partida e o placar de "um round de diferença para vencer"
const TIED_BEFORE_WIN = ROUNDS_TO_WIN_MATCH - 1

const reducedTurnTimes =
  SUDDEN_DEATH_TURN_DURATION_SECONDS === HOURGLASS_TURN_DURATION_SECONDS
    ? `${SUDDEN_DEATH_TURN_DURATION_SECONDS}s na Morte Súbita e sob Ampulheta`
    : `${SUDDEN_DEATH_TURN_DURATION_SECONDS}s na Morte Súbita e ${HOURGLASS_TURN_DURATION_SECONDS}s sob Ampulheta`

export const HOW_TO_PLAY_PAGES: readonly HowToPlayPage[] = [
  {
    id: 'objetivo',
    title: 'Objetivo',
    visual: 'board',
    points: [
      `Alinhe ${WIN_LENGTH} peças suas no tabuleiro ${BOARD_SIZE}×${BOARD_SIZE} para vencer o round.`,
      'A linha pode ser horizontal, vertical ou diagonal.',
      'Tabuleiro cheio sem linha: o round termina empatado.',
      'Peça congelada não conta para a linha.',
    ],
  },
  {
    id: 'turno-e-timer',
    title: 'Turno e timer',
    visual: 'timeouts',
    points: [
      `Cada turno dura ${TURN_DURATION_SECONDS}s (${reducedTurnTimes}).`,
      'Se o tempo estourar, a vez passa para o oponente.',
      `${MAX_CONSECUTIVE_TIMEOUTS} estouros seguidos dão a derrota por W.O.`,
      'O contador de estouros não zera na troca de round. Só zera quando o jogador joga ou usa uma habilidade.',
      'O menu de pausa não para o timer.',
    ],
  },
  {
    id: 'deck-e-habilidades',
    title: 'Deck e habilidades',
    visual: 'board',
    points: ['Conteúdo em construção.'],
    slides: [
      { id: 'provisorio-1', title: 'Item provisório 1', text: 'As habilidades entram aqui.' },
      { id: 'provisorio-2', title: 'Item provisório 2', text: 'As habilidades entram aqui.' },
    ],
  },
  {
    id: 'melhor-de-3',
    title: 'Melhor de 3 e Morte Súbita',
    visual: 'score',
    points: [
      `A partida tem até ${MAX_ROUNDS} rounds. Com ${ROUNDS_TO_WIN_MATCH}×0, ela termina antes do round ${MAX_ROUNDS}.`,
      `O round ${MAX_ROUNDS} é sempre a Morte Súbita, com ${SUDDEN_DEATH_TURN_DURATION_SECONDS}s por turno.`,
      `No fim dele, vence quem tiver mais rounds. Placar igual (${TIED_BEFORE_WIN}×${TIED_BEFORE_WIN} ou 0×0) é empate absoluto.`,
      'Quem começa é sorteado no round 1 e alterna a cada round.',
    ],
  },
  {
    id: 'coins',
    title: 'Coins',
    visual: 'coins',
    points: [],
    coinRows: [
      { label: 'Vitória', amount: COINS_REWARD.WIN },
      { label: 'Empate (cada jogador)', amount: COINS_REWARD.DRAW },
      { label: 'Derrota', amount: COINS_REWARD.LOSS },
      { label: 'Vitória por W.O.', amount: COINS_REWARD.WO_WIN },
      { label: 'Derrota por W.O.', amount: COINS_REWARD.WO_LOSS },
    ],
  },
]
