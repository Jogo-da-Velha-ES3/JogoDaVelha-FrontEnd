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
