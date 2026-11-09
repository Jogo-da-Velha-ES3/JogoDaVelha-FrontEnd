/**
 * Servidor simulado (FE-35): desligado por padrão desde a FE-50, com o back publicado. Sem a
 * variável, o front usa o back de verdade (VITE_API_URL e VITE_WEBSOCKET_URL).
 * Para jogar contra o robô: VITE_USE_MOCK_SERVER=true. A vitrine usa o simulado sempre.
 */
export const isMockServerEnabled = () => import.meta.env.VITE_USE_MOCK_SERVER === 'true'
