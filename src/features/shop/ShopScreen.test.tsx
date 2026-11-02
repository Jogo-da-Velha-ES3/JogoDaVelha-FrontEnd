import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from '../../api/auth'
import { recordMockMatch, resetMockAccounts } from '../../api/mockAccount'
import { useAuthStore } from '../../stores/authStore'
import { resetProfile, selectOwnedAbilities, useProfileStore } from '../../stores/profileStore'
import { useToastStore } from '../../stores/toastStore'
import { ShopScreen } from './ShopScreen'

// Sem a espera de 300ms do simulado: os testes não precisam do "carregando"
vi.mock('../../api/mockAccount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/mockAccount')>()),
  mockDelay: () => Promise.resolve(),
}))

/** Conta simulada com `coins` de saldo e a Loja já carregada, como depois de abrir o Hub */
async function renderShop(coins = 0) {
  if (coins > 0) recordMockMatch('WIN', coins)
  await useProfileStore.getState().loadProfile()
  render(<ShopScreen />)
}

const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) })
const toasts = () => useToastStore.getState().toasts

beforeEach(async () => {
  localStorage.clear()
  resetMockAccounts()
  resetProfile()
  useToastStore.setState({ toasts: [] })
  const session = await login('vini', 'qualquer')
  useAuthStore.getState().login(session.token)
})

describe('Loja (FE-31)', () => {
  it('abre em Personagens: X e O são seus, os outros à venda ou sem saldo', async () => {
    await renderShop(450)

    expect(screen.getByRole('heading', { name: 'Loja' })).toBeInTheDocument()
    expect(tab('Personagens')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText('Seu')).toHaveLength(2)
    // 450 Coins: Quadrado (400) à venda; Triângulo (500) falta 50
    expect(screen.getByRole('button', { name: 'Comprar Quadrado por 400 Coins' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Triângulo: Faltam 50 Coins' })).toBeDisabled()
  })

  it('Habilidades: as 3 iniciais são suas e as outras 7 custam 350', async () => {
    await renderShop()
    await userEvent.click(tab('Habilidades'))

    expect(screen.getAllByText('Seu')).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /: Faltam 350 Coins$/ })).toHaveLength(7)
  })

  it('Cosméticos aparece como "em breve", sem itens', async () => {
    await renderShop()
    await userEvent.click(tab('Cosméticos'))

    expect(screen.getByRole('tabpanel')).toHaveTextContent(/Em breve/)
    expect(screen.queryByRole('button', { name: /^Comprar/ })).not.toBeInTheDocument()
  })

  it('compra: confirma, e saldo e item só mudam com a resposta do servidor', async () => {
    await renderShop(400)

    await userEvent.click(screen.getByRole('button', { name: 'Comprar Quadrado por 400 Coins' }))
    const dialog = screen.getByRole('dialog', { name: 'Comprar Quadrado?' })
    expect(dialog).toHaveTextContent('Seu saldo fica em 0')
    // Ainda sem confirmar: nada muda
    expect(useProfileStore.getState().coinsBalance).toBe(400)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Comprar' }))

    await waitFor(() => expect(screen.getAllByText('Seu')).toHaveLength(3))
    expect(useProfileStore.getState().coinsBalance).toBe(0)
    expect(toasts().at(-1)).toMatchObject({ tone: 'coin', message: 'Quadrado é seu!' })
  })

  it('habilidade comprada entra nas opções da Preparação', async () => {
    await renderShop(350)
    await userEvent.click(tab('Habilidades'))

    await userEvent.click(screen.getByRole('button', { name: 'Comprar Tornado por 350 Coins' }))
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Comprar Tornado?' })).getByRole('button', {
        name: 'Comprar',
      }),
    )

    await waitFor(() =>
      expect(selectOwnedAbilities(useProfileStore.getState())).toContain('TORNADO'),
    )
  })

  it('erro do servidor vira toast vermelho e nada muda', async () => {
    await renderShop(400)
    // Outro aparelho gastou os Coins antes da confirmação: o servidor recusa
    localStorage.setItem(
      'jdv.mockAccounts',
      (localStorage.getItem('jdv.mockAccounts') ?? '').replace(
        '"coinsBalance":400',
        '"coinsBalance":0',
      ),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Comprar Quadrado por 400 Coins' }))
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Comprar Quadrado?' })).getByRole('button', {
        name: 'Comprar',
      }),
    )

    await waitFor(() =>
      expect(toasts().at(-1)).toMatchObject({
        tone: 'danger',
        message: 'Coins insuficientes para essa compra.',
      }),
    )
    expect(useProfileStore.getState().coinsBalance).toBe(400)
    expect(screen.getAllByText('Seu')).toHaveLength(2)
  })

  it('habilidade abre a demonstração no mini-tabuleiro', async () => {
    await renderShop()
    await userEvent.click(tab('Habilidades'))

    await userEvent.click(screen.getByRole('button', { name: 'Ver Bomba' }))

    const dialog = screen.getByRole('dialog', { name: 'Bomba' })
    expect(within(dialog).getByRole('figure', { name: 'Demonstração: Bomba' })).toBeInTheDocument()
    expect(within(dialog).getByRole('group', { name: 'Tabuleiro' })).toBeInTheDocument()
  })

  it('personagem comprado vira o favorito pelo botão "Usar como favorito"', async () => {
    await renderShop()

    await userEvent.click(screen.getByRole('button', { name: 'Ver O' }))
    await userEvent.click(screen.getByRole('button', { name: 'Usar como favorito' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Seu favorito' })).toBeDisabled())
    const equipped = useProfileStore.getState().characters.find((item) => item.equipped)
    expect(equipped?.code).toBe('O')
  })
})
