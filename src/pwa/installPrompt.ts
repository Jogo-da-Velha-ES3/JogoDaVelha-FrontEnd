// Guarda o convite de instalação do navegador (`beforeinstallprompt`, Chrome/Edge/Android) [RF-HUB-06].
// O navegador manda esse evento uma vez, logo que a página carrega, muitas vezes antes do Hub
// aparecer. Por isso a escuta começa no main.tsx, e o Hub só lê o que já foi guardado.

/** O evento não está no TypeScript (não é padrão W3C, só Chromium) */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallPromptState {
  /** Tem convite guardado e ainda não usado */
  hasPrompt: boolean
  /** O navegador avisou que o app acabou de ser instalado (`appinstalled`) */
  installed: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
let state: InstallPromptState = { hasPrompt: false, installed: false }
let listening = false
const listeners = new Set<() => void>()

function update(next: Partial<InstallPromptState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

function handleBeforeInstallPrompt(event: Event) {
  // Sem isso, o Chrome mostra a própria barrinha de instalação; o jogo usa o botão do Hub
  event.preventDefault()
  deferred = event as BeforeInstallPromptEvent
  update({ hasPrompt: true })
}

function handleAppInstalled() {
  deferred = null
  update({ hasPrompt: false, installed: true })
}

/** Começa a escutar (uma vez só). Chamado no main.tsx, antes de montar o app. */
export function listenForInstallPrompt(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getInstallPromptState = () => state

/**
 * Abre a janela de instalação do navegador. O convite só pode ser usado uma vez: depois dele,
 * o botão some até o navegador mandar outro (se o jogador recusar, ele pode mandar de novo depois).
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred
  if (!event) return 'unavailable'
  deferred = null
  update({ hasPrompt: false })
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome
}

/** Só para os testes: volta ao estado de página recém-aberta */
export function resetInstallPrompt(): void {
  if (listening) {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  }
  listening = false
  deferred = null
  state = { hasPrompt: false, installed: false }
  listeners.clear()
}
