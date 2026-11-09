/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_WEBSOCKET_URL?: string
  /** 'true' liga o servidor simulado (FE-35); sem ela (ou com outro valor), vale o back real */
  readonly VITE_USE_MOCK_SERVER?: string
  /** Cenário do simulado: normal, vitoria, empate-absoluto, morte-subita, virada, wo */
  readonly VITE_MOCK_SCENARIO?: string
  /** O que o bot faz no Resultado: aceita, recusa, ignora, pede, sai */
  readonly VITE_MOCK_REMATCH?: string
  /** Só testes: URL do back local para o teste ao vivo (src/sockets/liveBack.test.ts) */
  readonly VITE_LIVE_BACK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
