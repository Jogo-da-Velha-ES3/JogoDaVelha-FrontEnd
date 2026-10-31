import { AbilityIcon } from '../AbilityIcon'
import { EffectCell, type EffectProps } from './effectParts'

/**
 * Com "reduzir movimento": só o ícone num círculo, parado, na casa (no destino, quando a peça foi
 * movida) ou no centro do tabuleiro. Anulada mostra o Campo de Força; sem efeito fica tracejada
 */
export function StaticEffect({ result, target, destination }: EffectProps) {
  const at = destination ?? target ?? 'board'
  return (
    <EffectCell at={at}>
      <div
        className={[
          'absolute grid place-items-center rounded-full border-2 border-current bg-bg-deep/80',
          result.noEffect ? 'border-dashed' : 'shadow-[0_0_18px_currentColor]',
          at === 'board' ? 'inset-[32%]' : 'inset-[7%]',
        ].join(' ')}
      >
        <AbilityIcon
          ability={result.absorbed ? 'CAMPO_DE_FORCA' : result.ability}
          className="size-[55%]"
        />
      </div>
    </EffectCell>
  )
}
