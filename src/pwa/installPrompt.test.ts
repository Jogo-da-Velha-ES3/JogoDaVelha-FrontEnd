import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getInstallPromptState,
  listenForInstallPrompt,
  promptInstall,
  resetInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from './installPrompt'

/** Imita o evento que o Chrome manda quando o site pode ser instalado */
function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent
  const prompt = vi.fn<() => Promise<void>>(() => Promise.resolve())
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) })
  window.dispatchEvent(event)
  return { event, prompt }
}

afterEach(() => resetInstallPrompt())

describe('installPrompt', () => {
  it('guarda o convite e impede a barrinha do Chrome', () => {
    listenForInstallPrompt()
    const listener = vi.fn<() => void>()
    subscribeInstallPrompt(listener)

    const { event } = fireBeforeInstallPrompt()

    expect(event.defaultPrevented).toBe(true)
    expect(getInstallPromptState().hasPrompt).toBe(true)
    expect(listener).toHaveBeenCalled()
  })

  it('o convite só pode ser usado uma vez', async () => {
    listenForInstallPrompt()
    const { prompt } = fireBeforeInstallPrompt('dismissed')

    await expect(promptInstall()).resolves.toBe('dismissed')
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(getInstallPromptState().hasPrompt).toBe(false)
    await expect(promptInstall()).resolves.toBe('unavailable')
  })

  it('appinstalled marca como instalado e descarta o convite', () => {
    listenForInstallPrompt()
    fireBeforeInstallPrompt()
    window.dispatchEvent(new Event('appinstalled'))

    expect(getInstallPromptState()).toEqual({ hasPrompt: false, installed: true })
  })

  it('escutar duas vezes não duplica nada', () => {
    listenForInstallPrompt()
    listenForInstallPrompt()
    const listener = vi.fn<() => void>()
    subscribeInstallPrompt(listener)
    fireBeforeInstallPrompt()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
