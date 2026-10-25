import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BoardShowcase } from './BoardShowcase'
import { CellShowcase } from './CellShowcase'
import { CharacterShowcase } from './CharacterShowcase'
import { ComponentsShowcase } from './ComponentsShowcase'
import { MockMatchShowcase } from './MockMatchShowcase'
import { ShowcasePanel } from './ShowcaseLayout'
import { VitaoShowcase } from './VitaoShowcase'

interface Tab {
  id: string
  label: string
  description: string
  content: ReactNode
}

const TABS: Tab[] = [
  {
    id: 'partida',
    label: 'Jogar contra o robô',
    description:
      'Uma partida completa sem precisar do back: o oponente é um robô do servidor simulado. Escolha um cenário e siga o passo em destaque.',
    content: <MockMatchShowcase />,
  },
  {
    id: 'personagens',
    label: 'Personagens',
    description: 'Os 6 personagens no estilo letreiro neon, em todos os tamanhos usados no jogo.',
    content: <CharacterShowcase />,
  },
  {
    id: 'vitao',
    label: 'Vitão',
    description:
      'O bonequinho do Vitão em todas as expressões, no tamanho do espaço dele na Arena.',
    content: <VitaoShowcase />,
  },
  {
    id: 'tabuleiro',
    label: 'Tabuleiro',
    description: 'As casas com todos os estados da ERS e um tabuleiro para brincar sem o robô.',
    content: (
      <div className="flex flex-col gap-4">
        <CellShowcase />
        <BoardShowcase />
      </div>
    ),
  },
  {
    id: 'componentes',
    label: 'Cores e componentes',
    description:
      'As peças de interface que as telas usam: cores, botões, modal, avisos, banners e timer.',
    content: <ComponentsShowcase />,
  },
]

/**
 * Vitrine do time em /vitrine (sem login). Cada aba é um bloco separado; `?aba=` guarda a aba e
 * `?cenario=` já abre a partida contra o robô. Todas as abas ficam montadas, então a partida não
 * se perde ao trocar de aba.
 */
export function ShowcasePage() {
  const [params, setParams] = useSearchParams()
  const active = TABS.find((t) => t.id === params.get('aba'))?.id ?? TABS[0].id

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-4 short:gap-3 short:py-3">
      <header className="flex flex-col gap-1 border-b border-line pb-3">
        <h1 className="font-display text-4xl font-extrabold tracking-wide text-primary uppercase short:text-3xl">
          Vitrine do Jogo do{' '}
          <span className="text-char-x motion-safe:animate-neon-flicker">Velho</span>
        </h1>
        <p className="text-sm text-text-muted">
          Página de testes do time: veja o que já existe e jogue contra um robô. Não precisa de
          login.
        </p>
      </header>

      <nav
        role="tablist"
        aria-label="Seções da vitrine"
        className="sticky top-0 z-30 -mx-1 flex flex-wrap gap-2 bg-bg-deep/90 px-1 py-2 backdrop-blur"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`aba-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`painel-${tab.id}`}
            onClick={() => setParams({ aba: tab.id })}
            className={[
              'rounded-xl border-2 px-4 py-2 font-display font-bold tracking-wide uppercase transition-colors short:py-1.5',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              active === tab.id
                ? 'border-primary bg-primary text-on-primary'
                : 'border-line text-text-muted hover:border-primary/50 hover:text-primary',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`painel-${tab.id}`}
          aria-labelledby={`aba-${tab.id}`}
          hidden={active !== tab.id}
        >
          <ShowcasePanel title={tab.label} description={tab.description}>
            {tab.content}
          </ShowcasePanel>
        </div>
      ))}
    </main>
  )
}
