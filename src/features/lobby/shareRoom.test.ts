import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText, roomLink, shareRoomLink } from './shareRoom'

const writeText = vi.fn<(text: string) => Promise<void>>()
const share = vi.fn<(data?: ShareData) => Promise<void>>()

function stubNavigator({ withShare }: { withShare: boolean }) {
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: { writeText },
    share: withShare ? share : undefined,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  writeText.mockReset()
  share.mockReset()
})

describe('roomLink', () => {
  it('monta o link direto da sala', () => {
    expect(roomLink('4821', 'https://jogo.app')).toBe('https://jogo.app/sala/4821')
  })
})

describe('copyText', () => {
  it('devolve true quando copiou', async () => {
    stubNavigator({ withShare: false })
    writeText.mockResolvedValueOnce()
    await expect(copyText('4821')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('4821')
  })

  it('devolve false quando o navegador não deixa copiar', async () => {
    stubNavigator({ withShare: false })
    writeText.mockRejectedValueOnce(new Error('sem permissão'))
    await expect(copyText('4821')).resolves.toBe(false)
  })
})

describe('shareRoomLink', () => {
  it('usa a folha nativa quando existe', async () => {
    stubNavigator({ withShare: true })
    share.mockResolvedValueOnce()
    await expect(shareRoomLink('4821')).resolves.toBe('shared')
    expect(share.mock.calls[0][0]?.url).toMatch(/\/sala\/4821$/)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('fechar a folha sem escolher não é erro e não copia', async () => {
    stubNavigator({ withShare: true })
    share.mockRejectedValueOnce(new DOMException('cancelado', 'AbortError'))
    await expect(shareRoomLink('4821')).resolves.toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('sem folha nativa (desktop), copia o link', async () => {
    stubNavigator({ withShare: false })
    writeText.mockResolvedValueOnce()
    await expect(shareRoomLink('4821')).resolves.toBe('copied')
    expect(writeText.mock.calls[0][0]).toMatch(/\/sala\/4821$/)
  })

  it('folha nativa com erro cai para copiar', async () => {
    stubNavigator({ withShare: true })
    share.mockRejectedValueOnce(new DOMException('negado', 'NotAllowedError'))
    writeText.mockResolvedValueOnce()
    await expect(shareRoomLink('4821')).resolves.toBe('copied')
  })
})
