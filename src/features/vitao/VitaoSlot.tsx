import { VITAO_ENABLED } from '../../constants/game'

/**
 * Espaço do Vitão na coluna esquerda da Arena, entre os dois jogadores. No MVP 1 a flag fica
 * desligada: o espaço existe, mas nada aparece (PROJECT_CONTEXT §9).
 */
export function VitaoSlot() {
  return (
    <div data-region="vitao" aria-hidden={!VITAO_ENABLED} className="min-h-0 flex-1">
      {VITAO_ENABLED && <p className="text-xs text-text-muted">Vitão assistindo…</p>}
    </div>
  )
}
