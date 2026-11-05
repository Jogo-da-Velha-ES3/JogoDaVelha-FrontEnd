import { useSyncExternalStore } from 'react'
import { installMethod, type InstallMethod } from '../lib/installPlatform'
import { getInstallPromptState, promptInstall, subscribeInstallPrompt } from '../pwa/installPrompt'

/** Aberto como app instalado. Com `display: fullscreen` no manifest, o Android usa "fullscreen". */
export const STANDALONE_QUERY = '(display-mode: standalone), (display-mode: fullscreen)'

function isStandalone(): boolean {
  // iPhone: o Safari não tem display-mode confiável, mas tem navigator.standalone
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  // O jsdom dos testes não tem matchMedia
  const media =
    typeof window.matchMedia === 'function' && window.matchMedia(STANDALONE_QUERY).matches
  return iosStandalone || media
}

function subscribeStandalone(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const mql = window.matchMedia(STANDALONE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** Como o botão "Instalar App" do Hub deve se comportar neste navegador [RF-HUB-06] */
export function useInstallPrompt(): { method: InstallMethod; install: typeof promptInstall } {
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPromptState)
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => false)

  const method = installMethod({
    standalone: standalone || prompt.installed,
    hasPrompt: prompt.hasPrompt,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  })

  return { method, install: promptInstall }
}
