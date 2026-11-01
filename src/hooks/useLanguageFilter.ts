import { voiceText, type VoiceLine } from '../constants/texts'

/**
 * Filtro de linguagem das Configurações: ligado, as falas do narrador trocam pela versão filtrada
 * (FE-40) e o Vitão perde as falas `explicit` (FE-44).
 * TODO FE-39: ler do modal de Configurações (localStorage ou store de configurações).
 * Por enquanto, desligado: "sem filtro por padrão" (PROJECT_CONTEXT §9).
 */
export function useLanguageFilter(): boolean {
  return false
}

/** Escolhe a versão de cada fala do narrador (ver constants/texts.ts) pelo filtro atual */
export function useVoice() {
  const filterOn = useLanguageFilter()
  return <F extends string | null>(line: VoiceLine<F>) => voiceText(line, filterOn)
}
