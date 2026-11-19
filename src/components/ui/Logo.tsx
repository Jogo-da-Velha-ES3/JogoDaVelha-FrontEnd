import vitao from '../../features/vitao/assets/vitao-debochado.webp'

export type LogoSize = 'md' | 'lg'

export interface LogoProps {
  /** md: Hub (aba Jogar); lg: tela de Acesso */
  size?: LogoSize
  /** O nome é o título da tela (h1); na vitrine, que já tem o seu, vira texto */
  as?: 'h1' | 'p'
  className?: string
}

// Tablet e computador (tall:) maiores, para a marca não sumir ao lado dos botões e do formulário
const SIZES: Record<LogoSize, { gap: string; emblem: string; top: string; name: string }> = {
  md: {
    gap: 'gap-3 short:gap-2 tall:gap-4',
    emblem: 'size-12 short:size-10 tall:size-16',
    top: 'text-xs short:text-[0.625rem] tall:text-sm',
    name: 'text-3xl short:text-2xl tall:text-4xl',
  },
  lg: {
    gap: 'gap-3 short:gap-2 tall:gap-5',
    emblem: 'size-16 short:size-12 tall:size-24',
    top: 'text-sm short:text-xs tall:text-lg',
    name: 'text-4xl short:text-3xl tall:text-6xl',
  },
}

/**
 * Logo do jogo (decidido em 19/11): a cabeça do Vitão, debochado, sobre um anel neon que cintila
 * de leve, e o nome em letreiro com brilho. O nome é o título da tela (h1); a cabeça é decoração.
 * O ícone do app instalado e o favicon continuam com o X e o O.
 */
export function Logo({ size = 'md', as: Name = 'h1', className = '' }: LogoProps) {
  const s = SIZES[size]
  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <div aria-hidden className={`relative shrink-0 ${s.emblem}`}>
        {/* Anel atrás da cabeça: só ele cintila, como os tubos de neon dos personagens */}
        <span className="absolute inset-0 rounded-full border-2 border-primary bg-bg-raised shadow-glow motion-safe:animate-neon-flicker" />
        <img
          src={vitao}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full scale-[1.12] object-contain drop-shadow-[0_0_6px_rgb(244_242_255/0.35)]"
        />
      </div>
      <Name className="font-display leading-none font-extrabold text-primary uppercase [text-shadow:0_0_14px_rgb(244_242_255/0.55)]">
        <span className={`block tracking-[0.3em] text-text-muted ${s.top}`}>Jogo do</span>{' '}
        <span className={`block tracking-wide ${s.name}`}>Velho</span>
      </Name>
    </div>
  )
}
