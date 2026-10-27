// Service worker do Jogo do Velho (FE-16) [RNF-ARQ-03]. Só o básico para o app ser instalável e
// abrir mesmo sem rede. O jogo em si precisa do servidor: nada de partida, sala ou Coins passa aqui.
// - Páginas: rede primeiro (sempre a versão nova); sem rede, a última página guardada.
// - /assets/ (arquivos com hash no nome, que nunca mudam): cache primeiro.
// - API, WebSocket, outros sites e tudo que não é GET: direto para a rede, sem cache.
// Mudou este arquivo de um jeito que invalida o cache antigo? Troque a versão do CACHE.
const CACHE = 'jdv-v1'
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Toda rota do app é o mesmo index.html (SPA): guarda como "/"
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
