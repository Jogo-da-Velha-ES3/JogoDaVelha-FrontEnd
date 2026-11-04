import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Cor de fundo do jogo (--color-bg-deep em src/index.css): splash, barra do sistema e manifest
const BACKGROUND = '#07060e'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (FE-16) [RNF-ARQ-03]: gera o manifest e o service worker (Workbox) no build; o registro
    // fica em src/pwa/registerServiceWorker.ts. No `npm run dev` e nos testes fica desligado.
    VitePWA({
      registerType: 'autoUpdate',
      // 'auto' com o import de src/pwa/registerServiceWorker.ts: o plugin não injeta script nenhum
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Jogo do Velho',
        short_name: 'Jogo do Velho',
        description: 'Jogo da velha 4×4 multiplayer em tempo real, com habilidades.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: BACKGROUND,
        theme_color: BACKGROUND,
        categories: ['games'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Guarda o app (JS, CSS, HTML, imagens) para abrir sem rede. Sons ficam de fora (pesados).
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // Toda rota é o mesmo index.html (SPA); a API nunca passa pelo cache
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
