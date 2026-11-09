import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, useSettingsStore } from './settingsStore'

const saved = () => JSON.parse(localStorage.getItem('jdv.settings') ?? 'null')?.state

beforeEach(() => {
  localStorage.clear()
  useSettingsStore.setState(DEFAULT_SETTINGS)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('settingsStore (FE-39)', () => {
  it('começa sem filtro, com o Vitão, a vibração e o som ligados', () => {
    expect(useSettingsStore.getState()).toMatchObject({
      languageFilter: false,
      vitaoOn: true,
      vibrationOn: true,
      musicOn: true,
      sfxOn: true,
    })
  })

  it('guarda as preferências no aparelho, sem a função de atualizar', () => {
    useSettingsStore.getState().update({ languageFilter: true, musicVolume: 0.6 })
    expect(saved()).toEqual({ ...DEFAULT_SETTINGS, languageFilter: true, musicVolume: 0.6 })
  })

  it('sem armazenamento (aba anônima), continua funcionando na memória', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => useSettingsStore.getState().update({ vitaoOn: false })).not.toThrow()
    expect(useSettingsStore.getState().vitaoOn).toBe(false)
  })
})
