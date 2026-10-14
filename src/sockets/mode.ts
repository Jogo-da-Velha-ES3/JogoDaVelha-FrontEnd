/**
 * Servidor simulado (FE-35) ligado por padrão até o back estar pronto para a integração.
 * Para usar o back de verdade: VITE_USE_MOCK_SERVER=false.
 */
export const isMockServerEnabled = () => import.meta.env.VITE_USE_MOCK_SERVER !== 'false'
