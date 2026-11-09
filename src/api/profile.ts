// Perfil do jogador pelo REST do back (FE-30, FE-49) [RF-PRF-01] [RF-PRF-02]. Rotas da BE-027,
// conferidas contra o back na FE-49: GET /api/profile, GET /api/profile/stats e
// PATCH /api/profile/username. O prefixo /api já vem no VITE_API_URL. No simulado, a conta fica no
// aparelho (mockAccount.ts).
import { isMockServerEnabled } from '../sockets/mode'
import { apiRequest } from './client'
import { mockDelay, mockProfile, mockRename, mockStats } from './mockAccount'

/** GET /profile (ProfileResponse do back) */
export interface Profile {
  username: string
  coinsBalance: number
  /** Código do avatar equipado ('DEFAULT' sem nenhum). Avatares ficam para depois do MVP */
  avatar: string | null
  /**
   * Personagem mais usado nas partidas (não é o equipado), pelo **nome** ("Triângulo"), não pelo
   * código; null sem histórico. O front não usa
   */
  preferredCharacter: string | null
  /** Código do personagem favorito ('TRIANGULO'); null se nunca equipou. O Hub lê do catálogo */
  equippedCharacter: string | null
}

/** GET /profile/stats. A sequência é interrompida por empate ou derrota; W.O. a favor conta */
export interface ProfileStats {
  matchesPlayed: number
  wins: number
  currentWinStreak: number
  longestWinStreak: number
  /** Em porcentagem (ex: 60.0) */
  winRate: number
}

export async function getProfile(): Promise<Profile> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return mockProfile()
  }
  return apiRequest<Profile>('/profile')
}

export async function getStats(): Promise<ProfileStats> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return mockStats()
  }
  return apiRequest<ProfileStats>('/profile/stats')
}

/**
 * Troca o apelido (3 a 15 caracteres, único sem diferenciar maiúsculas). O back responde 204;
 * apelido em uso chega como 409 `USERNAME_ALREADY_EXISTS` e fora do tamanho, como 400
 * `VALIDATION_ERROR`. Quem valida o tamanho antes de enviar é a tela (`validateUsername`).
 */
export async function updateUsername(username: string): Promise<void> {
  if (isMockServerEnabled()) {
    await mockDelay()
    return mockRename(username)
  }
  await apiRequest<null>('/profile/username', {
    method: 'PATCH',
    body: { username: username.trim() },
  })
}
