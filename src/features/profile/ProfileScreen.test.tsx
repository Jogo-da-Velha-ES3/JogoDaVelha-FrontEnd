import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from '../../api/auth'
import { mockPurchase, recordMockMatch, resetMockAccounts } from '../../api/mockAccount'
import { routes } from '../../routes/routes'
import { useAuthStore } from '../../stores/authStore'
import { resetProfile, useProfileStore } from '../../stores/profileStore'
import { useToastStore } from '../../stores/toastStore'

// O servidor simulado só responde quando o teste manda (respond): assim dá para ver a tela antes
// e depois da resposta
const { pending } = vi.hoisted(() => ({ pending: [] as (() => void)[] }))
vi.mock('../../api/mockAccount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/mockAccount')>()),
  mockDelay: () => new Promise<void>((resolve) => pending.push(resolve)),
}))

async function respond() {
  await act(async () => {
    for (let round = 0; round < 5; round++) {
      pending.splice(0).forEach((resolve) => resolve())
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  })
}

/** Abre o Perfil (com o Hub em volta, como no jogo) e espera o perfil chegar */
async function openProfile() {
  const router = createMemoryRouter(routes, { initialEntries: ['/perfil'] })
  render(<RouterProvider router={router} />)
  await respond()
  return router
}

const button = (name: string) => screen.getByRole('button', { name })
const toasts = () => useToastStore.getState().toasts.map((toast) => toast.message)

beforeEach(async () => {
  localStorage.clear()
  resetMockAccounts()
  resetProfile()
  useToastStore.setState({ toasts: [] })
  pending.length = 0
  await login('rafa', 'qualquer') // outra conta, para o apelido em uso
  const session = await login('matheus', 'qualquer')
  // Matheus: 1 vitória e 1 derrota, e comprou o Quadrado
  recordMockMatch('WIN', 400)
  recordMockMatch('LOSS', 10)
  mockPurchase('CHARACTERS', 'simulado-CHARACTERS-QUADRADO')
  useAuthStore.getState().login(session.token)
})

describe('Perfil (FE-33)', () => {
  it('mostra estatísticas e coleção do servidor, sem texto de rascunho', async () => {
    await openProfile()

    expect(screen.getByRole('heading', { name: 'matheus' })).toBeInTheDocument()
    expect(screen.getByLabelText('3 de 6 desbloqueados')).toHaveTextContent('3/6')
    expect(screen.getByLabelText('3 de 10 desbloqueados')).toHaveTextContent('3/10')
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.queryByText(/e-mail/i)).not.toBeInTheDocument()
  })

  it('antes das estatísticas chegarem mostra "–", e não um 0 que depois muda', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/perfil'] })
    render(<RouterProvider router={router} />)
    expect(screen.getAllByText('–')).toHaveLength(4)
    expect(screen.queryByText('0%')).not.toBeInTheDocument()

    await respond()
    expect(screen.queryByText('–')).not.toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('taxa de vitória com no máximo 1 casa (o back manda sem arredondar)', async () => {
    await openProfile()

    act(() =>
      useProfileStore.setState({
        stats: {
          matchesPlayed: 3,
          wins: 2,
          currentWinStreak: 0,
          longestWinStreak: 2,
          winRate: 66.66666666666667,
        },
      }),
    )

    expect(screen.getByText('66,7%')).toBeInTheDocument()
  })

  it('apelido só muda depois da resposta do servidor e aparece no topo do Hub', async () => {
    await openProfile()

    await userEvent.click(button('Editar apelido'))
    await userEvent.clear(screen.getByLabelText('Apelido'))
    await userEvent.type(screen.getByLabelText('Apelido'), 'Matheuzinho')
    await userEvent.click(button('Salvar'))

    // Ainda sem resposta: nada mudou
    expect(button('Salvando…')).toBeDisabled()
    expect(useProfileStore.getState().profile?.username).toBe('matheus')
    expect(screen.getByRole('banner')).toHaveTextContent('matheus')

    await respond()

    expect(screen.getByRole('heading', { name: 'Matheuzinho' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveTextContent('Matheuzinho')
    expect(toasts()).toContain('Apelido atualizado.')
  })

  it('apelido em uso: o erro fica embaixo do campo até mexer nele', async () => {
    await openProfile()

    await userEvent.click(button('Editar apelido'))
    await userEvent.clear(screen.getByLabelText('Apelido'))
    await userEvent.type(screen.getByLabelText('Apelido'), 'RAFA')
    await userEvent.click(button('Salvar'))
    await respond()

    const field = screen.getByLabelText('Apelido')
    expect(screen.getByRole('alert')).toHaveTextContent('Esse nome de usuário já está em uso.')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(useProfileStore.getState().profile?.username).toBe('matheus')

    await userEvent.type(field, 'el')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('apelido fora de 3 a 15 caracteres não vai para o servidor', async () => {
    await openProfile()

    await userEvent.click(button('Editar apelido'))
    await userEvent.clear(screen.getByLabelText('Apelido'))
    await userEvent.type(screen.getByLabelText('Apelido'), 'ab')
    await userEvent.click(button('Salvar'))

    expect(screen.getByRole('alert')).toHaveTextContent('de 3 a 15 caracteres')
    expect(pending).toHaveLength(0)
  })

  it('personagem bloqueado leva à aba Personagens da Loja', async () => {
    const router = await openProfile()

    await userEvent.click(button('Estrela, bloqueado, ver na loja'))

    expect(router.state.location.pathname).toBe('/loja')
    expect(router.state.location.search).toBe('?categoria=characters')
    expect(screen.getByRole('tab', { name: /^Personagens/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('habilidade bloqueada leva à aba Habilidades; a que o jogador tem só aparece', async () => {
    const router = await openProfile()

    expect(screen.getByRole('img', { name: 'Bomba' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Bomba/ })).not.toBeInTheDocument()

    await userEvent.click(button('Congelar, bloqueado, ver na loja'))

    expect(router.state.location.search).toBe('?categoria=skills')
    expect(screen.getByRole('tab', { name: /^Habilidades/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('favorito: troca só com a resposta, e um de cada vez', async () => {
    await openProfile()

    await userEvent.click(button('Quadrado, usar como favorito'))

    // Esperando o servidor: o X continua o favorito e os outros ficam travados
    expect(button('X, favorito')).toBeDisabled()
    expect(button('O, usar como favorito')).toBeDisabled()

    await respond()

    expect(button('Quadrado, favorito')).toBeDisabled()
    expect(button('X, usar como favorito')).toBeEnabled()
    expect(toasts()).toContain('Quadrado agora é o seu favorito.')
    const characters = within(screen.getByRole('region', { name: 'Personagens' }))
    expect(characters.getAllByRole('button')).toHaveLength(6)
  })
})
