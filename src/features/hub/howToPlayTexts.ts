// Textos do modal "Como Jogar" (FE-34). Ficam fora do componente para o grupo de Personalidade
// (FE-40) revisar o tom depois. Fonte das regras: docs/PROJECT_CONTEXT.md.
// Conteúdo PROVISÓRIO: o texto final das páginas entra nas próximas partes da FE-34.

/** Subpágina do carrossel interno de uma página (ex: uma habilidade por vez) */
export interface HowToPlaySlide {
  id: string
  title: string
  text: string
}

export interface HowToPlayPage {
  id: string
  title: string
  points: readonly string[]
  /** Carrossel dentro da página; a navegação principal (páginas) não muda por causa dele */
  slides?: readonly HowToPlaySlide[]
}

export const HOW_TO_PLAY_TEXTS = {
  title: 'Como Jogar',
  close: 'Fechar',
  previous: 'Anterior',
  next: 'Próximo',
  pagesNav: 'Páginas',
  previousSlide: 'Item anterior',
  nextSlide: 'Próximo item',
  pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
  pageLabel: (page: number, total: number, title: string) => `Página ${page} de ${total}: ${title}`,
  slideOf: (slide: number, total: number) => `${slide}/${total}`,
} as const

export const HOW_TO_PLAY_PAGES: readonly HowToPlayPage[] = [
  {
    id: 'objetivo',
    title: 'Objetivo',
    points: ['Conteúdo em construção.'],
  },
  {
    id: 'turno-e-timer',
    title: 'Turno e timer',
    points: ['Conteúdo em construção.'],
  },
  {
    id: 'deck-e-habilidades',
    title: 'Deck e habilidades',
    points: ['Conteúdo em construção.'],
    slides: [
      { id: 'provisorio-1', title: 'Item provisório 1', text: 'As habilidades entram aqui.' },
      { id: 'provisorio-2', title: 'Item provisório 2', text: 'As habilidades entram aqui.' },
    ],
  },
  {
    id: 'melhor-de-3',
    title: 'Melhor de 3 e Morte Súbita',
    points: ['Conteúdo em construção.'],
  },
  {
    id: 'coins',
    title: 'Coins',
    points: ['Conteúdo em construção.'],
  },
]
