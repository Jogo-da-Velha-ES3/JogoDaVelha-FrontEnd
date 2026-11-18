import { shouldEnterFullscreen } from '../lib/gameFullscreen'

/** Aberto como app instalado (o manifest usa `display: fullscreen`) */
const STANDALONE_QUERY = '(display-mode: standalone), (display-mode: fullscreen)'

const matches = (query: string) =>
  typeof window.matchMedia === 'function' && window.matchMedia(query).matches

/** Um pedido em andamento: o mesmo toque pode chamar duas vezes (app instalado + Criar sala) */
let requesting = false

/**
 * Põe o jogo em tela cheia e trava a paisagem no celular Android (FRT-02). Chamar direto no toque
 * do jogador, antes de qualquer `await`: o navegador só deixa entrar em tela cheia com um gesto.
 * Se ele recusar, o jogo segue como estava.
 */
export function enterGameFullscreen() {
  const root = document.documentElement
  const enter = shouldEnterFullscreen({
    fullscreenEnabled:
      document.fullscreenEnabled === true && typeof root.requestFullscreen === 'function',
    fullscreen: document.fullscreenElement != null,
    coarsePointer: matches('(pointer: coarse)'),
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  })
  if (!enter || requesting) return
  requesting = true
  // A trava de orientação só vale em tela cheia (Android); o TypeScript não tem mais o `lock`
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: 'landscape') => Promise<void>
  }
  root
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => orientation.lock?.('landscape'))
    .catch(() => {
      // O navegador recusou: o jogo segue como estava
    })
    .finally(() => {
      requesting = false
    })
}

/**
 * App instalado no Android: o manifest abre em tela cheia, mas sem a Fullscreen API o Android
 * pinta a faixa da câmera com a cor da janela do navegador (branca na Samsung Internet). O primeiro
 * toque põe a página em tela cheia e ela passa a ocupar essa faixa com o fundo do jogo. Se o
 * jogador sair da tela cheia (voltar do Android), o toque seguinte entra de novo.
 *
 * Chamar uma vez, no carregamento. No navegador (não instalado), não faz nada: lá, a tela cheia
 * vem só com Criar sala e Entrar.
 */
export function keepInstalledAppFullscreen() {
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    matches(STANDALONE_QUERY)
  if (!standalone) return
  // `pointerup` (e não `pointerdown`): no toque, é ele que conta como gesto do jogador
  document.addEventListener('pointerup', enterGameFullscreen, { capture: true, passive: true })
}
