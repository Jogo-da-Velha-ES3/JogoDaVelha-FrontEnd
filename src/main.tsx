import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSound } from './features/sound'
import { keepInstalledAppFullscreen } from './pwa/gameFullscreen'
import { listenForInstallPrompt } from './pwa/installPrompt'
import { registerServiceWorker } from './pwa/registerServiceWorker'

initSound()
// PWA (FE-16): o convite de instalação chega logo no carregamento, antes do Hub aparecer.
// O service worker vem do vite-plugin-pwa e recarrega a página quando sai versão nova.
listenForInstallPrompt()
registerServiceWorker()
// App instalado no Android: tela cheia desde o primeiro toque, sem a faixa clara da câmera (FRT-02)
keepInstalledAppFullscreen()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
