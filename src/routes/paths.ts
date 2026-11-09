// Caminhos das rotas — docs/ARCHITECTURE.md §2. Usar estas constantes em vez de strings soltas.
export const PATHS = {
  access: '/entrar',
  resetPassword: '/redefinir-senha',
  play: '/',
  shop: '/loja',
  profile: '/perfil',
  room: '/sala/:codigo',
  showcase: '/vitrine',
} as const

export const roomPath = (code: string) => `/sala/${code}`

/** Aba da Loja que dá para abrir pelo link (o Perfil leva o item bloqueado para a aba dele) */
export type ShopTabParam = 'characters' | 'skills'
export const SHOP_TAB_PARAM = 'categoria'
export const shopPath = (tab: ShopTabParam) => `${PATHS.shop}?${SHOP_TAB_PARAM}=${tab}`
