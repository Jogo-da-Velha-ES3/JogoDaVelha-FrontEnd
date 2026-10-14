/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_WEBSOCKET_URL?: string
  /** 'false' desliga o servidor simulado (FE-35); qualquer outro valor deixa ligado */
  readonly VITE_USE_MOCK_SERVER?: string
  /** Cenário do simulado: normal, vitoria, empate-absoluto, morte-subita, wo */
  readonly VITE_MOCK_SCENARIO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
