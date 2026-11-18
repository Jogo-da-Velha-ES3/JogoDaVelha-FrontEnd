import { afterEach, describe, expect, it, vi } from 'vitest'
import { enterGameFullscreen, keepInstalledAppFullscreen } from './gameFullscreen'

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0 Mobile Safari/537.36'

/** Celular Android: toque, Fullscreen API e a trava de orientação; `installed`: app instalado */
function android({ installed = false } = {}) {
  const requestFullscreen = vi.fn<(options?: FullscreenOptions) => Promise<void>>(() =>
    Promise.resolve(),
  )
  const lock = vi.fn<(orientation: string) => Promise<void>>(() => Promise.resolve())
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreen,
  })
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(pointer: coarse)' || (installed && query.includes('display-mode')),
  }))
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID)
  vi.stubGlobal('screen', { orientation: { lock } })
  return { requestFullscreen, lock }
}

/** O pedido termina (o `requesting` volta a false) antes do próximo teste */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(async () => {
  await settle()
  document.removeEventListener('pointerup', enterGameFullscreen, { capture: true })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
  Reflect.deleteProperty(document, 'fullscreenEnabled')
})

describe('enterGameFullscreen (FRT-02)', () => {
  it('no Android, pede tela cheia e trava a paisagem', async () => {
    const { requestFullscreen, lock } = android()
    enterGameFullscreen()
    expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' })
    await vi.waitFor(() => expect(lock).toHaveBeenCalledWith('landscape'))
  })

  it('dois pedidos no mesmo toque viram um só', () => {
    const { requestFullscreen } = android()
    enterGameFullscreen()
    enterGameFullscreen()
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
  })

  it('o navegador recusa: segue sem erro', () => {
    const { requestFullscreen } = android()
    requestFullscreen.mockReturnValue(Promise.reject(new Error('negado')))
    expect(() => enterGameFullscreen()).not.toThrow()
  })

  it('sem Fullscreen API (jsdom, iPhone): não faz nada', () => {
    expect(() => enterGameFullscreen()).not.toThrow()
  })
})

describe('keepInstalledAppFullscreen (FRT-02)', () => {
  it('app instalado: qualquer toque põe a página em tela cheia (sem a faixa da câmera)', () => {
    const { requestFullscreen } = android({ installed: true })
    keepInstalledAppFullscreen()
    document.body.dispatchEvent(new Event('pointerup', { bubbles: true }))
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
  })

  it('no navegador, o toque comum não muda nada (lá é só Criar sala e Entrar)', () => {
    const { requestFullscreen } = android()
    keepInstalledAppFullscreen()
    document.body.dispatchEvent(new Event('pointerup', { bubbles: true }))
    expect(requestFullscreen).not.toHaveBeenCalled()
  })
})
