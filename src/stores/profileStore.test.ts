import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from '../api/auth'
import { MOCK_COIN_PACKAGES, recordMockMatch, resetMockAccounts } from '../api/mockAccount'
import { useAuthStore } from './authStore'
import { INITIAL_MATCH_STATE, useMatchStore } from './matchStore'
import {
  resetProfile,
  selectFavoriteCharacter,
  selectOwnedAbilities,
  selectOwnedCharacters,
  useProfileStore,
} from './profileStore'

// Sem a espera de 300ms do simulado: os testes não precisam do "carregando"
vi.mock('../api/mockAccount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/mockAccount')>()),
  mockDelay: () => Promise.resolve(),
}))

const state = () => useProfileStore.getState()
const idOf = (category: 'characters' | 'skills', code: string) =>
  state()[category].find((item) => item.code === code)?.id ?? ''

beforeEach(async () => {
  localStorage.clear()
  resetMockAccounts()
  resetProfile()
  useMatchStore.setState(INITIAL_MATCH_STATE)
  const session = await login('vini', 'qualquer')
  useAuthStore.getState().login(session.token)
})

describe('profileStore (FE-30)', () => {
  it('antes de carregar: só os iniciais liberados e o X no Hub', () => {
    expect(state().status).toBe('idle')
    expect(selectOwnedCharacters(state())).toEqual(['X', 'O'])
    expect(selectOwnedAbilities(state())).toEqual(['BOMBA', 'ESCUDO', 'AMPULHETA'])
    expect(selectFavoriteCharacter(state())).toBe('X')
  })

  it('loadProfile traz perfil, estatísticas, catálogo e saldo do servidor', async () => {
    await state().loadProfile()

    expect(state().status).toBe('ready')
    expect(state().profile?.username).toBe('vini')
    expect(state().coinsBalance).toBe(0)
    expect(state().stats?.matchesPlayed).toBe(0)
    expect(state().characters).toHaveLength(6)
    expect(state().skills).toHaveLength(10)
  })

  it('compra: saldo e inventário só mudam com a resposta do servidor', async () => {
    recordMockMatch('WIN', 400)
    await state().loadProfile()

    const pending = state().buy('CHARACTERS', idOf('characters', 'QUADRADO'))
    // Ainda sem resposta: nada otimista
    expect(state().coinsBalance).toBe(400)
    expect(selectOwnedCharacters(state())).toEqual(['X', 'O'])

    await pending
    expect(state().coinsBalance).toBe(0)
    expect(selectOwnedCharacters(state())).toEqual(['X', 'O', 'QUADRADO'])
  })

  it('compra recusada sai como erro do back e não mexe em nada', async () => {
    await state().loadProfile()

    await expect(state().buy('SKILLS', idOf('skills', 'TORNADO'))).rejects.toMatchObject({
      code: 'INSUFFICIENT_COINS',
    })
    expect(state().coinsBalance).toBe(0)
    expect(selectOwnedAbilities(state())).not.toContain('TORNADO')
  })

  it('Coins simbólicos: o saldo novo vem do servidor depois da compra', async () => {
    await state().loadProfile()

    await state().buyCoins(MOCK_COIN_PACKAGES[1].id)

    expect(state().coinsBalance).toBe(500)
  })

  it('trocar o apelido e equipar mudam a tela depois da confirmação', async () => {
    await state().loadProfile()

    await state().rename('Vinizera')
    await state().equip(idOf('characters', 'O'))

    expect(state().profile?.username).toBe('Vinizera')
    expect(selectFavoriteCharacter(state())).toBe('O')
  })

  it('apelido em uso: o erro chega à tela e o nome antigo fica', async () => {
    await login('rafa', 'qualquer')
    await login('vini', 'qualquer')
    await state().loadProfile()

    await expect(state().rename('rafa')).rejects.toMatchObject({ code: 'USERNAME_ALREADY_EXISTS' })
    expect(state().profile?.username).toBe('vini')
  })

  it('depois do MATCH_END, busca o saldo e as estatísticas que o servidor creditou', async () => {
    await state().loadProfile()

    // O servidor (aqui, o simulado) credita a partida antes de avisar
    recordMockMatch('WIN', 50)
    useMatchStore.setState({ outcome: { kind: 'WIN', winner: 'P1', score: [2, 0] } })

    await vi.waitFor(() => expect(state().coinsBalance).toBe(50))
    expect(state().stats).toMatchObject({ matchesPlayed: 1, wins: 1, longestWinStreak: 1 })
  })

  it('Sair da conta limpa o perfil, mesmo com uma resposta ainda a caminho', async () => {
    await state().loadProfile()

    const loading = state().loadProfile()
    useAuthStore.getState().logout()
    await loading

    expect(state().status).toBe('idle')
    expect(state().profile).toBeNull()
    expect(state().coinsBalance).toBeNull()
  })
})
