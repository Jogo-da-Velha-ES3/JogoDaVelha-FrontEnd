// Service worker do PWA (FE-16), registrado aqui em vez do script que o vite-plugin-pwa injetaria.
// Motivo: depois de um deploy, quem abre o jogo recebe a versão velha do cache, e o service worker
// novo assume em segundos e apaga do cache os arquivos dela. Sem recarregar, o primeiro arquivo
// carregado sob demanda (ex: a conexão da sala) não existe mais, e a sala não abre.
import { matchPath } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { PATHS } from '../routes/paths'

export function registerServiceWorker(): void {
  registerSW({
    immediate: true,
    // Versão nova no ar: recarrega para usá-la. Na sala, não: a recarga derrubaria a partida, e o
    // código da sala já carregou; a versão nova entra na próxima vez que o jogo abrir.
    onNeedReload() {
      if (!matchPath(PATHS.room, window.location.pathname)) window.location.reload()
    },
  })
}
