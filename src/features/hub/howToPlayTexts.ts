// Textos do modal "Como Jogar" (FE-34). Ficam fora do componente para o grupo de Personalidade
// (FE-40) revisar o tom depois. Fonte das regras: docs/PROJECT_CONTEXT.md. Todo número de regra
// vem de constants/game.ts.
//
// ATENÇÃO: a página "Melhor de 3 e Morte Súbita" segue a regra decidida em 18/10
// (PROJECT_CONTEXT §6), que AINDA É A VALIDAR COM O BACK. Se o back decidir diferente, só essa
// página muda.
//
// Nome e descrição das habilidades vêm de ABILITY_INFO (constants/abilities.ts), sem cópia aqui.

import { ABILITY_INFO, type AbilityKind } from '../../constants/abilities'
import {
  ABILITIES,
  BOARD_SIZE,
  COINS_REWARD,
  DECK_SIZE,
  DRAW_OPTIONS,
  DRAW_PICK_SECONDS,
  HOURGLASS_TURN_DURATION_SECONDS,
  INITIAL_ABILITIES_TO_PICK,
  MAX_CONSECUTIVE_TIMEOUTS,
  MAX_ROUNDS,
  ROUNDS_TO_WIN_MATCH,
  SUDDEN_DEATH_TURN_DURATION_SECONDS,
  TURN_DURATION_SECONDS,
  WIN_LENGTH,
} from '../../constants/game'
import type { AbilityId } from '../../types/game'

/** Visual existente da base usado na página, sempre estático */
export type HowToPlayVisual =
  | 'board' // Board com uma linha vencedora
  | 'timeouts' // faixa do jogador com os estouros x/3
  | 'score' // faixas dos dois jogadores com os rounds vencidos
  | 'coins' // moeda dos Coins, uma por linha da tabela
  | 'deck' // página própria (HowToPlayDeck): deck de exemplo e carrossel das habilidades

export interface HowToPlayCoinRow {
  label: string
  amount: number
}

export interface HowToPlayPage {
  id: string
  title: string
  visual: HowToPlayVisual
  points: readonly string[]
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
  deckCarousel: 'Deck e habilidades',
  deckSlotInitial: 'Inicial',
  deckSlotDrawn: 'Sorteada',
  abilityKinds: {
    OFENSIVA: 'Ofensiva',
    DEFENSIVA: 'Defensiva',
    MOVIMENTO: 'Movimento',
  } satisfies Record<AbilityKind, string>,
  /** Nomes das faixas de exemplo (sem relação com jogadores reais) */
  demoSelf: 'Você',
  demoOpponent: 'Oponente',
  pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
  pageLabel: (page: number, total: number, title: string) => `Página ${page} de ${total}: ${title}`,
  slideOf: (slide: number, total: number) => `${slide}/${total}`,
} as const

const DRAWN_PER_ROUND = DECK_SIZE - INITIAL_ABILITIES_TO_PICK

/** Cartas do deck de exemplo, na ordem: as iniciais e depois a sorteada */
export const HOW_TO_PLAY_DECK_SLOTS: readonly ('initial' | 'drawn')[] = [
  ...Array.from({ length: INITIAL_ABILITIES_TO_PICK }, () => 'initial' as const),
  ...Array.from({ length: DRAWN_PER_ROUND }, () => 'drawn' as const),
]

// Carrossel das habilidades: agrupadas por tipo (ofensivas, defensivas, movimento), na ordem do
// catálogo dentro de cada tipo, em subpáginas de ABILITIES_PER_SLIDE. Nome e descrição: ABILITY_INFO.
const KIND_ORDER: readonly AbilityKind[] = ['OFENSIVA', 'DEFENSIVA', 'MOVIMENTO']
const ABILITIES_PER_SLIDE = 2
const ABILITIES_BY_KIND = KIND_ORDER.flatMap((kind) =>
  ABILITIES.filter((id) => ABILITY_INFO[id].kind === kind),
)
export const HOW_TO_PLAY_ABILITY_SLIDES: readonly (readonly AbilityId[])[] = Array.from(
  { length: Math.ceil(ABILITIES_BY_KIND.length / ABILITIES_PER_SLIDE) },
  (_, index) =>
    ABILITIES_BY_KIND.slice(index * ABILITIES_PER_SLIDE, (index + 1) * ABILITIES_PER_SLIDE),
)

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
    visual: 'deck',
    points: [
      `O deck tem ${DECK_SIZE} habilidades: ${INITIAL_ABILITIES_TO_PICK} iniciais, escolhidas na Preparação, e ${DRAWN_PER_ROUND} sorteada a cada round.`,
      `O sorteio mostra ${DRAW_OPTIONS} cartas e dá ${DRAW_PICK_SECONDS}s para escolher. Se o tempo acabar, uma é escolhida automaticamente.`,
      'Cada habilidade vale 1 uso por round, e usá-la gasta o turno.',
      'O deck do oponente é oculto.',
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
