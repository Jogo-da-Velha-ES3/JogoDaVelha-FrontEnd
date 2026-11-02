import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSound } from './features/sound'
import { listenForInstallPrompt } from './pwa/installPrompt'

initSound()
// PWA (FE-16): o convite de instalação chega logo no carregamento, antes do Hub aparecer.
// O service worker é registrado pelo vite-plugin-pwa (vite.config.ts).
listenForInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
