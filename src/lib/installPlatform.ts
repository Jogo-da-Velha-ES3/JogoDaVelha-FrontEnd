// Como oferecer a instalação do app (FE-16) [RF-HUB-06]. Sem React, para testar isolado.

/**
 * - installed:   já está aberto como app (não mostra o botão)
 * - prompt:      Chrome/Edge/Android guardaram o convite de instalação (`beforeinstallprompt`)
 * - ios:         iPhone/iPad não têm esse convite; o jogador instala pelo menu Compartilhar
 * - unavailable: navegador sem instalação pelo site (ex: Firefox no computador)
 */
export type InstallMethod = 'installed' | 'prompt' | 'ios' | 'unavailable'

export interface InstallContext {
  /** Aberto como app: `display-mode` standalone/fullscreen, ou `navigator.standalone` no iPhone */
  standalone: boolean
  /** O navegador mandou o `beforeinstallprompt` e ele ainda não foi usado */
  hasPrompt: boolean
  userAgent: string
  maxTouchPoints: number
}

/** iPhone, iPod ou iPad. O iPad recente se diz "Macintosh", mas tem toque (o Mac não). */
export function isIOS(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

export function installMethod(context: InstallContext): InstallMethod {
  if (context.standalone) return 'installed'
  if (context.hasPrompt) return 'prompt'
  if (isIOS(context.userAgent, context.maxTouchPoints)) return 'ios'
  return 'unavailable'
}
