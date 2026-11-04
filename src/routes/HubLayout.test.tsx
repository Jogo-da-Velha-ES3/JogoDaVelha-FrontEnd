import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../stores/authStore'
import { resetProfile, useProfileStore } from '../stores/profileStore'
import { routes } from './routes'

// Topo do Hub com o back de verdade (FE-30): o perfil vem do REST, aqui imitado pelo fetch
const fetchMock = vi.fn<typeof fetch>()
let backOnline = true

const PROFILE = { username: 'vini', coinsBalance: 150, avatar: null, preferredCharacter: null }
const STATS = { matchesPlayed: 0, wins: 0, currentWinStreak: 0, longestWinStreak: 0, winRate: 0 }

function backResponse(url: string): unknown {
  if (url.endsWith('/profile')) return PROFILE
  if (url.endsWith('/profile/stats')) return STATS
  return [] // catálogo de personagens e de habilidades
}

const renderHub = () => render(<RouterProvider router={createMemoryRouter(routes)} />)
const retryButton = () => screen.queryByRole('button', { name: 'Tentar de novo' })

beforeEach(() => {
  localStorage.clear()
  backOnline = true
  fetchMock.mockImplementation((input) =>
    backOnline
      ? Promise.resolve(new Response(JSON.stringify(backResponse(String(input))), { status: 200 }))
      : Promise.reject(new TypeError('Failed to fetch')),
  )
  vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
  vi.stubGlobal('fetch', fetchMock)
  resetProfile()
  useAuthStore.getState().login('token-teste')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('topo do Hub', () => {
  it('mostra apelido e Coins confirmados pelo servidor', async () => {
    renderHub()

    expect(await screen.findByText('vini')).toBeInTheDocument()
    expect(screen.getByText(/150 Coins/)).toBeInTheDocument()
  })

  it('perfil que nunca chegou: avisa e deixa tentar de novo', async () => {
    backOnline = false
    renderHub()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar seu perfil.',
    )
    expect(screen.queryByText(/Coins/)).not.toBeInTheDocument()

    backOnline = true
    await userEvent.click(retryButton()!)

    expect(await screen.findByText('vini')).toBeInTheDocument()
    expect(screen.getByText(/150 Coins/)).toBeInTheDocument()
    expect(retryButton()).not.toBeInTheDocument()
  })

  it('recarga que falha mantém o último perfil confirmado, sem aviso', async () => {
    renderHub()
    await screen.findByText('vini')

    backOnline = false
    await act(() => useProfileStore.getState().loadProfile())

    expect(useProfileStore.getState().status).toBe('error')
    expect(screen.getByText('vini')).toBeInTheDocument()
    expect(screen.getByText(/150 Coins/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
