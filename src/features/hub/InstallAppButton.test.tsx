import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listenForInstallPrompt, resetInstallPrompt } from '../../pwa/installPrompt'
import { useToastStore } from '../../stores/toastStore'
import { mockMatchMedia } from '../../test/matchMedia'
import { InstallAppButton } from './InstallAppButton'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed') {
  const prompt = vi.fn<() => Promise<void>>(() => Promise.resolve())
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return prompt
}

const installButton = () => screen.queryByRole('button', { name: 'Instalar app' })

beforeEach(() => {
  mockMatchMedia(false) // aberto no navegador, não como app
  listenForInstallPrompt()
})

afterEach(() => {
  resetInstallPrompt()
  // Volta ao userAgent do jsdom (o do protótipo), caso o teste do iPhone tenha trocado
  delete (navigator as { userAgent?: string }).userAgent
  useToastStore.setState({ toasts: [] })
})

describe('InstallAppButton', () => {
  it('não aparece sem convite do navegador (ex: Firefox no computador)', () => {
    render(<InstallAppButton />)
    expect(installButton()).not.toBeInTheDocument()
  })

  it('aparece quando o convite chega, mesmo depois de a tela abrir', () => {
    render(<InstallAppButton />)
    fireBeforeInstallPrompt('accepted')
    expect(installButton()).toBeInTheDocument()
  })

  it('abre a instalação do navegador e avisa quando instala', async () => {
    render(<InstallAppButton />)
    const prompt = fireBeforeInstallPrompt('accepted')

    await userEvent.click(installButton()!)

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(useToastStore.getState().toasts.at(-1)?.message).toMatch(/Jogo instalado/)
  })

  it('recusou: o botão some (o convite foi usado) e não avisa nada', async () => {
    render(<InstallAppButton />)
    fireBeforeInstallPrompt('dismissed')

    await userEvent.click(installButton()!)

    expect(installButton()).not.toBeInTheDocument()
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('no iPhone mostra o passo a passo do Compartilhar', async () => {
    Object.defineProperty(navigator, 'userAgent', { value: IPHONE, configurable: true })
    render(<InstallAppButton />)

    await userEvent.click(installButton()!)

    expect(screen.getByRole('heading', { name: 'Instalar o jogo' })).toBeInTheDocument()
    expect(screen.getByText('Escolha "Adicionar à Tela de Início"')).toBeInTheDocument()
  })

  it('já aberto como app: não aparece', () => {
    mockMatchMedia(true)
    render(<InstallAppButton />)
    fireBeforeInstallPrompt('accepted')
    expect(installButton()).not.toBeInTheDocument()
  })
})
