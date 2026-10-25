// Corpo do Vitão (FE-41): desenho de cartoon no mesmo estilo da cabeça (contorno preto grosso,
// cores chapadas com uma sombra), em coordenadas de 120×180. Cabeção estilo chibi (~60% da altura)
// para as expressões continuarem legíveis no espaço de ~100px da Arena [PROJECT_CONTEXT §9].
import bravo from './assets/vitao-bravo.webp'
import debochado from './assets/vitao-debochado.webp'
import diabo from './assets/vitao-diabo.webp'
import dormindo from './assets/vitao-dormindo.webp'
import muitoBravo from './assets/vitao-muito-bravo.webp'
import normal from './assets/vitao-normal.webp'
import rindo from './assets/vitao-rindo.webp'
import surpreso from './assets/vitao-surpreso.webp'

export type VitaoExpression =
  'normal' | 'rindo' | 'debochado' | 'bravo' | 'muito-bravo' | 'surpreso' | 'dormindo' | 'diabo'

export const VITAO_EXPRESSIONS: Record<VitaoExpression, { image: string; label: string }> = {
  normal: { image: normal, label: 'normal' },
  rindo: { image: rindo, label: 'rindo' },
  debochado: { image: debochado, label: 'debochado' },
  bravo: { image: bravo, label: 'bravo' },
  'muito-bravo': { image: muitoBravo, label: 'muito bravo' },
  surpreso: { image: surpreso, label: 'surpreso' },
  dormindo: { image: dormindo, label: 'dormindo' },
  diabo: { image: diabo, label: 'Diabo' },
}

/**
 * Neon do Vitão: o contorno em volta da silhueta. Branco dos botões
 * (`--color-primary`), porque o Vitão não usa a cor de nenhum personagem.
 */
export const VITAO_COLOR = '#f4f2ff'
/** Vermelho de perigo (`--color-danger`) na versão Diabo da Morte Súbita */
export const VITAO_DEVIL_COLOR = '#ff2d3d'

export type PaletteKey =
  | 'outline'
  | 'skin'
  | 'skinShade'
  | 'shirt'
  | 'shirtShade'
  | 'jeans'
  | 'jeansShade'
  | 'shoe'
  | 'sole'

/** Pele no tom das cabeças; camiseta preta, calça jeans e tênis branco */
export const VITAO_PALETTE: Record<PaletteKey, string> = {
  outline: '#15121d',
  skin: '#fdaf77',
  skinShade: '#e4925c',
  shirt: '#2c2839',
  shirtShade: '#201d2b',
  jeans: '#3f62a3',
  jeansShade: '#2e4a7e',
  shoe: '#f4f2ff',
  sole: '#b8b2cc',
}

/** Na versão Diabo só a pele muda, no vermelho da cabeça */
export const VITAO_DEVIL_PALETTE: Record<PaletteKey, string> = {
  ...VITAO_PALETTE,
  skin: '#e12115',
  skinShade: '#a5120a',
}

/** Começa logo acima do cabelo, para não sobrar espaço vazio em cima no espaço da Arena */
export const VITAO_VIEWBOX = '0 8 120 172'

/**
 * Cabeça (imagem quadrada): o queixo cai em cima da gola, que acompanha a inclinação do tronco
 * para a direita. Deslocada para a direita para o rosto, e não a orelha, ficar no meio do corpo.
 */
export const VITAO_HEAD = { x: 15, y: 10, size: 104 }

/**
 * O desenho da cabeça já vem inclinado (a linha dos olhos desce ~9° para a direita): a imagem
 * gira de volta em volta do queixo para a cabeça ficar reta em cima do corpo.
 */
export const VITAO_HEAD_TILT = { angle: -9, pivot: [73, 106] as const }

/** Espessura do contorno preto, igual ao traço das cabeças nesse tamanho */
export const OUTLINE_WIDTH = 1.4

/**
 * Uma forma do desenho: `fill` pinta por dentro, `line` passa o contorno preto, e `stroke`
 * desenha só um traço grosso (o rabo do Diabo).
 */
export interface Shape {
  d: string
  fill?: PaletteKey
  line?: boolean
  stroke?: { color: PaletteKey; width: number }
}

export type VitaoPart =
  'tronco' | 'braco-esquerdo' | 'braco-direito' | 'perna-esquerda' | 'perna-direita'

/**
 * As partes que a FE-42 anima, cada uma com o ponto em que gira (ombro, quadril ou cintura).
 *
 * Vista de três-quartos, como as cabeças: o Vitão está virado para a direita de quem olha a tela.
 * O tronco inclina um pouco para a direita (o alto vai mais para o lado), a barriga e os dois tênis
 * apontam para a direita, e o lado direito do desenho é o que fica mais longe: o braço direito
 * aparece atrás da barriga, a perna direita um pouco mais alta, e o braço esquerdo passa por cima
 * do tronco.
 * "Esquerdo" é o lado esquerdo de quem olha a tela.
 */
export const VITAO_PARTS: Record<VitaoPart, { pivot: readonly [number, number]; shapes: Shape[] }> =
  {
    tronco: {
      pivot: [61, 148],
      shapes: [
        // Pescoço (quase todo escondido pela cabeça), camiseta com a barriga para a direita e a
        // sombra no lado de trás (esquerda)
        { d: 'M60.1 99 L72.1 99 L71.5 108 L59.5 108 Z', fill: 'skin', line: true },
        {
          d: 'M45.5 109 Q52.8 104 64.8 103 Q76.8 104 81.5 109 Q89.4 126 80.4 144 Q62.1 149 44.3 145 Q40.3 128 45.5 109 Z',
          fill: 'shirt',
          line: true,
        },
        {
          d: 'M46.5 109 Q51.6 106 54.6 106 Q48.4 126 51.2 146 Q47.2 146 44.8 145 Q40.8 128 46.5 109 Z',
          fill: 'shirtShade',
        },
        { d: 'M56.7 105 Q66.3 111 75.7 105', line: true },
        // Cós da calça, por cima do começo das pernas
        { d: 'M44.4 143 Q62.1 149 80.4 143 L79 151 Q61 156 44 151 Z', fill: 'jeans', line: true },
      ],
    },
    // Braço da frente: pendurado do ombro esquerdo, com a manga por cima do canto do ombro, o
    // antebraço e a mão de cartoon
    'braco-esquerdo': {
      pivot: [46.5, 110],
      shapes: [
        {
          d: 'M39 118.5 L47 120.5 Q47 129.5 45 136.5 L38 135.5 Q38.5 126.5 39 118.5 Z',
          fill: 'skin',
          line: true,
        },
        {
          d: 'M43.5 121 L46.6 121.5 Q46.6 129.5 44.7 136.1 L42.4 135.8 Q43.8 128.5 43.5 121 Z',
          fill: 'skinShade',
        },
        // Mão fechada de cartoon, centrada na ponta do antebraço, sem o polegar aparecendo
        {
          d: 'M43.8 133.5 Q48.8 136.5 47.3 141.5 Q45.3 146 40.3 145 Q35.8 143.5 35.6 139 Q35.8 135.5 37.3 135 Z',
          fill: 'skin',
          line: true,
        },
        { d: 'M44.6 142.1 Q42.6 140.9 42.2 138.7', line: true },
        {
          d: 'M49 106 Q40 107.5 37.5 119 L47.5 122.5 Q48.5 116 52 111 Z',
          fill: 'shirt',
          line: true,
        },
      ],
    },
    // Braço de trás: fica atrás da barriga; só a ponta da manga, um pedaço do antebraço e a mão
    // aparecem do lado direito
    'braco-direito': {
      pivot: [80, 110],
      shapes: [
        {
          d: 'M76 107 Q84 108 87 117 L82.5 120 Q81 114 75.5 110.5 Z',
          fill: 'shirt',
          line: true,
        },
        {
          d: 'M82.5 118 L87 116.5 Q90.5 126 89.5 136 L84 136.5 Q84.5 127 82.5 118 Z',
          fill: 'skin',
          line: true,
        },
        {
          d: 'M86.8 117 L87 116.5 Q90.5 126 89.5 136 L87.6 136.2 Q88.6 126 86.8 117 Z',
          fill: 'skinShade',
        },
        // Mão fechada igual à da frente, centrada na ponta do antebraço
        {
          d: 'M89 133.5 Q94 136.5 92.5 141.5 Q90.5 146 85.5 145 Q81 143.5 80.8 139 Q81 135.5 82.5 135 Z',
          fill: 'skin',
          line: true,
        },
        { d: 'M89.85 142.1 Q87.85 140.9 87.45 138.7', line: true },
      ],
    },
    // Perna da frente: jeans e o tênis com a ponta para a direita
    'perna-esquerda': {
      pivot: [51, 150],
      shapes: [
        { d: 'M45 149 Q51 152 57.5 151.5 L56.5 167 L46.5 167 Z', fill: 'jeans', line: true },
        { d: 'M45.3 150 L49.5 151.3 L49 167 L46.5 167 Z', fill: 'jeansShade' },
        {
          d: 'M46 165 L56 165 Q61 165.5 64.5 168.5 Q67 172 64 175 L45.5 175 Q43 172 46 165 Z',
          fill: 'shoe',
          line: true,
        },
        {
          d: 'M44.6 172 L66 172 Q65.7 174.2 64 174.4 L45.6 174.4 Q44.8 173.6 44.6 172 Z',
          fill: 'sole',
        },
        { d: 'M54.5 165.4 Q57.5 168.6 60.5 166.4', line: true },
      ],
    },
    // Perna de trás: um pouco mais alta e à direita, com o tênis também para a direita
    'perna-direita': {
      pivot: [71, 149],
      shapes: [
        { d: 'M62 151 Q70 151.5 77.5 148.5 L75.5 165 L64.5 165 Z', fill: 'jeans', line: true },
        { d: 'M62.3 151.2 L66.5 151.6 L66.5 165 L64.4 165 Z', fill: 'jeansShade' },
        {
          d: 'M64.5 163 L74.5 163 Q79.5 163.5 83 166.5 Q85.5 170 82.5 173 L64 173 Q61.5 170 64.5 163 Z',
          fill: 'shoe',
          line: true,
        },
        {
          d: 'M63.1 170 L84.5 170 Q84.2 172.2 82.5 172.4 L64.1 172.4 Q63.3 171.6 63.1 170 Z',
          fill: 'sole',
        },
        { d: 'M73 163.4 Q76 166.6 79 164.4', line: true },
      ],
    },
  }

/** De trás para a frente: braço de trás, pernas (o cós cobre o começo), tronco e braço da frente */
export const VITAO_PART_ORDER: VitaoPart[] = [
  'braco-direito',
  'perna-direita',
  'perna-esquerda',
  'tronco',
  'braco-esquerdo',
]

/** Rabo do Diabo, saindo das costas (à esquerda, porque ele está virado para a direita) */
export const DEVIL_TAIL: Shape[] = [
  { d: 'M48.6 140 Q25.2 147 23.3 129 Q22.3 120 29 117', stroke: { color: 'outline', width: 4.4 } },
  { d: 'M48.6 140 Q25.2 147 23.3 129 Q22.3 120 29 117', stroke: { color: 'skin', width: 2.2 } },
  { d: 'M27.4 118.5 L35.7 113 L25.4 110.5 Z', fill: 'skin', line: true },
]
