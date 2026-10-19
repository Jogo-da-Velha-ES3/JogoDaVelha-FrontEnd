// Textos do modal "Como Jogar" (FE-34). Ficam fora do componente para o grupo de Personalidade
// (FE-40) revisar o tom depois. Fonte das regras: docs/PROJECT_CONTEXT.md. Todo número de regra
// vem de constants/game.ts.
//
// Destaque: o trecho entre `**` aparece em negrito com um brilho leve (ver HowToPlayRichText).
//
// ATENÇÃO: a página "Melhor de 3" (com a Morte Súbita) segue a regra decidida em 18/10
// (PROJECT_CONTEXT §6), que AINDA É A VALIDAR COM O BACK. Se o back decidir diferente, só essa
// página muda.
//
// ATENÇÃO (para quem revisar o tom, FE-40): as páginas cabem por pouco em 330px de altura (celular
// deitado), em especial "Habilidades". Confira o tamanho no celular deitado antes de alongar as
// regras do deck ou as descrições de ABILITY_INFO, senão a página passa a rolar.
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
  | 'turn' // faixas dos dois jogadores, com a barra de tempo do jogador parada
  | 'suddenDeath' // rótulo do round e timer da Morte Súbita parados
  | 'coins' // moeda dos Coins, uma por linha da tabela
  | 'deck' // página própria (HowToPlayDeck): regras do deck e carrossel das habilidades

export interface HowToPlayCoinRow {
  label: string
  amount: number
  /** Cor do nome do resultado: vitória em verde, derrota em vermelho, empate neutro */
  tone: 'win' | 'loss' | 'draw'
}

export interface HowToPlayPage {
  id: string
  title: string
  visual: HowToPlayVisual
  /** Texto maior (página do Objetivo) */
  largeText?: boolean
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
  deckCarousel: 'Habilidades',
  abilityKinds: {
    OFENSIVA: 'Ofensiva',
    DEFENSIVA: 'Defensiva',
    MOVIMENTO: 'Movimento',
  } satisfies Record<AbilityKind, string>,
  abilityDot: (name: string, n: number, total: number) => `${name} (${n} de ${total})`,
  /** Nomes das faixas de exemplo (sem relação com jogadores reais) */
  demoSelf: 'Você',
  demoOpponent: 'Oponente',
  /** Rótulo do round como na Arena (canto superior esquerdo), em maiúsculas pelo estilo */
  suddenDeathRound: `Round ${MAX_ROUNDS} · Morte Súbita`,
  pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
  pageLabel: (page: number, total: number, title: string) => `Página ${page} de ${total}: ${title}`,
  slideOf: (slide: number, total: number) => `${slide}/${total}`,
} as const

const DRAWN_PER_ROUND = DECK_SIZE - INITIAL_ABILITIES_TO_PICK

// Carrossel das habilidades: agrupadas por tipo (ofensivas, defensivas, movimento), na ordem do
// catálogo dentro de cada tipo, uma por vez. Nome e descrição: ABILITY_INFO.
const KIND_ORDER: readonly AbilityKind[] = ['OFENSIVA', 'DEFENSIVA', 'MOVIMENTO']
export const HOW_TO_PLAY_ABILITY_ORDER: readonly AbilityId[] = KIND_ORDER.flatMap((kind) =>
  ABILITIES.filter((id) => ABILITY_INFO[id].kind === kind),
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
    largeText: true,
    points: [
      `Alinhe **${WIN_LENGTH} peças** suas no tabuleiro **${BOARD_SIZE}×${BOARD_SIZE}** para vencer o round.`,
      'A linha pode ser **horizontal, vertical ou diagonal**.',
      'Tabuleiro cheio sem linha: o round termina **empatado**.',
      'Peça **congelada** não conta para a linha.',
    ],
  },
  {
    id: 'turno-e-timer',
    title: 'Turno e timer',
    visual: 'turn',
    points: [
      `Cada turno dura **${TURN_DURATION_SECONDS}s** (${reducedTurnTimes}).`,
      'Se o tempo estourar, a vez passa para o oponente.',
      `**${MAX_CONSECUTIVE_TIMEOUTS} estouros seguidos** dão a derrota por **W.O.**`,
      'O contador de estouros **não zera na troca de round**. Só zera quando o jogador joga ou usa uma habilidade.',
      'O menu de pausa **não para o timer**.',
    ],
  },
  {
    id: 'deck-e-habilidades',
    title: 'Habilidades',
    visual: 'deck',
    points: [
      `Em cada round você joga com **${DECK_SIZE} habilidades**: **${INITIAL_ABILITIES_TO_PICK} iniciais** e **${DRAWN_PER_ROUND} sorteada**.`,
      `No sorteio, escolha **1 de ${DRAW_OPTIONS} cartas** em **${DRAW_PICK_SECONDS}s**; sem escolha, é automático.`,
      'Cada habilidade vale **1 uso por round**, e usar uma **gasta o turno**.',
      'O deck do oponente é **oculto**.',
    ],
  },
  {
    id: 'melhor-de-3',
    title: 'Melhor de 3',
    visual: 'suddenDeath',
    points: [
      `A partida tem até **${MAX_ROUNDS} rounds**. Com **${ROUNDS_TO_WIN_MATCH}×0**, ela termina antes do round ${MAX_ROUNDS}.`,
      `O round ${MAX_ROUNDS} é sempre a **Morte Súbita**, com **${SUDDEN_DEATH_TURN_DURATION_SECONDS}s** por turno.`,
      `No fim dele, vence quem tiver **mais rounds**. Placar igual (${TIED_BEFORE_WIN}×${TIED_BEFORE_WIN} ou 0×0) é **empate absoluto**.`,
      'Quem começa é sorteado no round 1 e **alterna a cada round**.',
    ],
  },
  {
    id: 'coins',
    title: 'Coins',
    visual: 'coins',
    points: [],
    // Ordem de leitura do grid de 2 colunas: vitórias, derrotas e, sozinho no centro, o empate
    coinRows: [
      { label: 'Vitória', amount: COINS_REWARD.WIN, tone: 'win' },
      { label: 'Vitória por W.O.', amount: COINS_REWARD.WO_WIN, tone: 'win' },
      { label: 'Derrota', amount: COINS_REWARD.LOSS, tone: 'loss' },
      { label: 'Derrota por W.O.', amount: COINS_REWARD.WO_LOSS, tone: 'loss' },
      { label: 'Empate', amount: COINS_REWARD.DRAW, tone: 'draw' },
    ],
  },
]
