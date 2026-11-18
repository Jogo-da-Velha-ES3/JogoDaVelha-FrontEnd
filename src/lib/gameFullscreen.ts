// Tela cheia no celular Android (FRT-02, decidido em 17/11). A página só é desenhada por baixo do
// recorte da câmera em tela cheia pela Fullscreen API (com `viewport-fit=cover`): fora dela, o
// Android pinta a faixa da câmera com a cor da janela do navegador (branca na Samsung Internet,
// mesmo no app instalado, que abre em tela cheia pelo manifest).
// - No navegador, a barra de endereço deixa o celular deitado com ~280–340px de altura: o toque
//   em Criar sala ou Entrar põe o jogo em tela cheia.
// - No app instalado, qualquer toque põe a página em tela cheia, para a faixa da câmera ficar com
//   o fundo do jogo.
// O iPhone não deixa pôr a página em tela cheia fora do app instalado.
import { isIOS } from './installPlatform'

export interface FullscreenContext {
  /** O navegador deixa pôr a página em tela cheia (Fullscreen API) */
  fullscreenEnabled: boolean
  /** A página já está em tela cheia */
  fullscreen: boolean
  /** O toque é a entrada principal (celular, tablet): no computador, nada muda */
  coarsePointer: boolean
  userAgent: string
  maxTouchPoints: number
}

/** Pode pôr o jogo em tela cheia agora, a partir de um toque do jogador? */
export function shouldEnterFullscreen(context: FullscreenContext): boolean {
  return (
    context.fullscreenEnabled &&
    !context.fullscreen &&
    context.coarsePointer &&
    !isIOS(context.userAgent, context.maxTouchPoints)
  )
}
