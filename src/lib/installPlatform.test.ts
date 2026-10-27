import { describe, expect, it } from 'vitest'
import { installMethod, isIOS } from './installPlatform'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP_MODE =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const FIREFOX_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'

describe('isIOS', () => {
  it('reconhece iPhone e o iPad que se diz Mac (tem toque)', () => {
    expect(isIOS(IPHONE, 5)).toBe(true)
    expect(isIOS(IPAD_DESKTOP_MODE, 5)).toBe(true)
  })

  it('Mac de verdade (sem toque) e Android não são iOS', () => {
    expect(isIOS(IPAD_DESKTOP_MODE, 0)).toBe(false)
    expect(isIOS(ANDROID, 5)).toBe(false)
  })
})

describe('installMethod', () => {
  const base = { standalone: false, hasPrompt: false, userAgent: ANDROID, maxTouchPoints: 5 }

  it('já aberto como app: installed, mesmo com convite guardado', () => {
    expect(installMethod({ ...base, standalone: true, hasPrompt: true })).toBe('installed')
  })

  it('com o convite do navegador: prompt', () => {
    expect(installMethod({ ...base, hasPrompt: true })).toBe('prompt')
  })

  it('iPhone sem convite: ios (passo a passo pelo Compartilhar)', () => {
    expect(installMethod({ ...base, userAgent: IPHONE })).toBe('ios')
  })

  it('navegador sem instalação: unavailable', () => {
    expect(installMethod({ ...base, userAgent: FIREFOX_DESKTOP, maxTouchPoints: 0 })).toBe(
      'unavailable',
    )
  })
})
