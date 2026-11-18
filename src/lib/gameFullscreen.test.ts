import { describe, expect, it } from 'vitest'
import { type FullscreenContext, shouldEnterFullscreen } from './gameFullscreen'

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

const androidBrowser: FullscreenContext = {
  fullscreenEnabled: true,
  fullscreen: false,
  coarsePointer: true,
  userAgent: ANDROID,
  maxTouchPoints: 5,
}

describe('shouldEnterFullscreen (FRT-02)', () => {
  it('celular Android (navegador ou app instalado): entra em tela cheia', () => {
    expect(shouldEnterFullscreen(androidBrowser)).toBe(true)
  })

  it('já em tela cheia ou navegador sem Fullscreen API: nada muda', () => {
    expect(shouldEnterFullscreen({ ...androidBrowser, fullscreen: true })).toBe(false)
    expect(shouldEnterFullscreen({ ...androidBrowser, fullscreenEnabled: false })).toBe(false)
  })

  it('computador (mouse) e iPhone/iPad ficam como estão', () => {
    expect(shouldEnterFullscreen({ ...androidBrowser, coarsePointer: false })).toBe(false)
    expect(shouldEnterFullscreen({ ...androidBrowser, userAgent: IPHONE })).toBe(false)
  })
})
