import { voiceText, type VoiceLine } from '../constants/texts'
import { useSettingsStore } from '../stores/settingsStore'

/**
 * Filtro de linguagem das Configurações (FE-39): ligado, as falas do narrador trocam pela versão
 * filtrada (FE-40) e o Vitão perde as falas `explicit` (FE-44). Desligado por padrão: "sem filtro
 * por padrão" (PROJECT_CONTEXT §9).
 */
export function useLanguageFilter(): boolean {
  return useSettingsStore((s) => s.languageFilter)
}

/** Escolhe a versão de cada fala do narrador (ver constants/texts.ts) pelo filtro atual */
export function useVoice() {
  const filterOn = useLanguageFilter()
  return <F extends string | null>(line: VoiceLine<F>) => voiceText(line, filterOn)
}
