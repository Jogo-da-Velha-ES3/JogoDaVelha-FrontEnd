import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSound } from './features/sound'
import { listenForInstallPrompt } from './pwa/installPrompt'
import { registerServiceWorker } from './pwa/registerServiceWorker'

initSound()
// PWA (FE-16): o convite de instalação chega logo no carregamento, antes do Hub aparecer.
// O service worker vem do vite-plugin-pwa e recarrega a página quando sai versão nova.
listenForInstallPrompt()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
