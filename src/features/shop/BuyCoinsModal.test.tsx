import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from '../../api/auth'
import type { CoinPackage } from '../../api/shop'
import { resetMockAccounts } from '../../api/mockAccount'
import { useAuthStore } from '../../stores/authStore'
import { resetProfile, useProfileStore } from '../../stores/profileStore'
import { useToastStore } from '../../stores/toastStore'
import { BuyCoinsModal } from './BuyCoinsModal'

// Sem a espera de 300ms do simulado: os testes não precisam do "carregando"
vi.mock('../../api/mockAccount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/mockAccount')>()),
  mockDelay: () => Promise.resolve(),
}))

// Controla buyCoins e getCoinPackages; o resto do shop.ts segue o real
const mocks = vi.hoisted(() => ({
  buyCoins: vi.fn<(id: string) => Promise<number>>(),
  getCoinPackages: vi.fn<() => Promise<CoinPackage[]>>(),
}))

vi.mock('../../api/shop', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shop')>()),
  buyCoins: mocks.buyCoins,
  getCoinPackages: mocks.getCoinPackages,
}))

const PACKAGES = [
  { id: 'pkg-100', coins: 100, priceInReais: 4.99 },
  { id: 'pkg-500', coins: 500, priceInReais: 19.99 },
  { id: 'pkg-1000', coins: 1000, priceInReais: 34.99 },
]

beforeEach(async () => {
  localStorage.clear()
  resetMockAccounts()
  resetProfile()
  useToastStore.setState({ toasts: [] })
  mocks.buyCoins.mockReset()
  mocks.getCoinPackages.mockResolvedValue(PACKAGES)
  const session = await login('lucas', 'qualquer')
  useAuthStore.getState().login(session.token)
  await useProfileStore.getState().loadProfile()
})

describe('Comprar Coins (FE-32)', () => {
  it('o saldo só atualiza depois da resposta da API', async () => {
    let resolveBuy!: (value: number) => void
    mocks.buyCoins.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveBuy = resolve
        }),
    )

    render(<BuyCoinsModal open onClose={() => {}} />)

    // O do meio (500) vem selecionado, como no esboço
    await screen.findByRole('button', { name: 'Receber 500 Coins' })
    await userEvent.click(screen.getByRole('button', { name: 'Receber 500 Coins' }))

    // Durante o envio: botão diz "Comprando…" e o saldo não mudou (nada otimista)
    await screen.findByRole('button', { name: 'Comprando…' })
    expect(useProfileStore.getState().coinsBalance).toBe(0)

    // Resposta chega: saldo atualiza e toast de sucesso aparece
    resolveBuy(500)
    await waitFor(() => expect(useProfileStore.getState().coinsBalance).toBe(500))
    expect(useToastStore.getState().toasts.at(-1)).toMatchObject({
      tone: 'coin',
      message: '+500 Coins',
    })
  })

  it('não tem campo de pagamento ou cartão e mostra o aviso fixo', async () => {
    render(<BuyCoinsModal open onClose={() => {}} />)

    // Pacotes carregam e o aviso fixo aparece
    expect(await screen.findByText(/Compra simbólica: nada é cobrado/)).toBeInTheDocument()

    // Nenhum campo de pagamento, cartão ou dados pessoais
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryAllByPlaceholderText(/cartão|pagamento|cpf|email/i)).toHaveLength(0)
  })

  it('erro de compra não soma saldo e permite tentar de novo', async () => {
    mocks.buyCoins.mockRejectedValueOnce(new Error('network'))

    render(<BuyCoinsModal open onClose={() => {}} />)

    await screen.findByRole('button', { name: 'Receber 500 Coins' })
    await userEvent.click(screen.getByRole('button', { name: 'Receber 500 Coins' }))

    // Erro aparece e o saldo não mudou
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Tente de novo'))
    expect(useProfileStore.getState().coinsBalance).toBe(0)

    // Pode tentar de novo: o botão voltou ao normal
    expect(screen.getByRole('button', { name: 'Receber 500 Coins' })).toBeEnabled()
  })
})
