import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

/** Preferências das Configurações (FE-39), guardadas no aparelho */
export interface Settings {
  musicOn: boolean
  /** 0 a 1 */
  musicVolume: number
  sfxOn: boolean
  /** 0 a 1 */
  sfxVolume: number
  /** Volume da voz do Vitão (0 a 1): a voz chega com a FE-48 */
  voiceVolume: number
  vibrationOn: boolean
  /** Desligado: sem o balão e sem a voz do Vitão (PROJECT_CONTEXT §9) */
  vitaoOn: boolean
  /** Ligado: falas com palavrão trocam pela versão filtrada ou somem (VOICE_GUIDE) */
  languageFilter: boolean
}

interface SettingsState extends Settings {
  update: (changes: Partial<Settings>) => void
}

/** Sem filtro por padrão (PROJECT_CONTEXT §9); música mais baixa que os efeitos */
export const DEFAULT_SETTINGS: Settings = {
  musicOn: true,
  musicVolume: 0.3,
  sfxOn: true,
  sfxVolume: 1,
  voiceVolume: 1,
  vibrationOn: true,
  vitaoOn: true,
  languageFilter: false,
}

/** Navegação privada ou armazenamento bloqueado: as preferências duram só esta aba, sem erro */
const deviceStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      // Sem armazenamento: fica só na memória
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      // Nada a limpar
    }
  },
}

// Estado só de interface: não reflete nada do servidor (ARCHITECTURE §3)
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (changes) => set(changes),
    }),
    {
      name: 'jdv.settings',
      storage: createJSONStorage(() => deviceStorage),
      partialize: ({ update: _update, ...settings }) => settings,
    },
  ),
)
