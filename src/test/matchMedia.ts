import { vi } from 'vitest'

/**
 * Substitui o window.matchMedia (que o jsdom não tem) por um controlável no teste.
 * `set` muda o resultado e avisa quem está ouvindo, como uma rotação de tela.
 */
export function mockMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  const matchMedia = vi.fn<(media: string) => unknown>((media) => ({
    media,
    get matches() {
      return matches
    },
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  }))

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })

  return {
    matchMedia,
    set(value: boolean) {
      matches = value
      listeners.forEach((listener) => listener())
    },
  }
}
