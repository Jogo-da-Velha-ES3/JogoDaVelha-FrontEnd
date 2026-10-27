// Registra o service worker (public/sw.js) [RNF-ARQ-03]. Só no build de produção: no `npm run dev`
// e nos testes ele atrapalharia (cache de arquivos que estão mudando).
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    // Sem service worker o jogo funciona igual, só não fica instalável: o erro não vai para a tela
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
