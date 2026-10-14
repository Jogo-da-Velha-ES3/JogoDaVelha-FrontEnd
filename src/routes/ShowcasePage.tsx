import { useState } from 'react'
import { Banner, Button, Modal } from '../components/ui'
import { CHARACTER_INFO } from '../constants/characters'
import { showToast } from '../stores/toastStore'
import type { CharacterId } from '../types/game'
import { BoardShowcase } from './BoardShowcase'
import { CellShowcase } from './CellShowcase'
import { CharacterShowcase } from './CharacterShowcase'
import { TimerShowcase } from './TimerShowcase'

const SYSTEM_COLORS = [
  { name: 'Perigo', token: 'bg-danger' },
  { name: 'Coins', token: 'bg-coin' },
  { name: 'Botão', token: 'bg-primary' },
  { name: 'Painel', token: 'bg-bg-panel' },
  { name: 'Elevado', token: 'bg-bg-raised' },
]

// Vitrine dos tokens e componentes base (FE-23), em /vitrine, para o time consultar
export function ShowcasePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [banner, setBanner] = useState<'turn' | 'death' | null>(null)

  const flashBanner = (kind: 'turn' | 'death') => {
    setBanner(kind)
    setTimeout(() => setBanner(null), 1800)
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 py-5 short:gap-3 short:py-3">
        <header className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <h1 className="font-display text-4xl font-extrabold tracking-wide text-primary uppercase short:text-3xl">
            Jogo do <span className="text-char-x motion-safe:animate-neon-flicker">Velho</span>
          </h1>
          <span className="font-mono text-xs text-text-muted">FE-23 · tokens e componentes</span>
        </header>

        <section aria-labelledby="cores" className="grid gap-3 sm:grid-cols-2">
          <div>
            <h2
              id="cores"
              className="mb-2 font-display text-lg font-bold text-text-muted uppercase"
            >
              Personagens
            </h2>
            <ul className="flex flex-wrap gap-2">
              {(Object.keys(CHARACTER_INFO) as CharacterId[]).map((id) => (
                <li
                  key={id}
                  className="rounded-lg border-2 px-3 py-1 font-display font-bold uppercase shadow-glow"
                  style={{
                    borderColor: CHARACTER_INFO[id].color,
                    color: CHARACTER_INFO[id].color,
                    ['--tw-shadow-color' as string]: `${CHARACTER_INFO[id].color}55`,
                  }}
                >
                  {CHARACTER_INFO[id].name}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-text-muted uppercase">
              Sistema
            </h2>
            <ul className="flex flex-wrap gap-2">
              {SYSTEM_COLORS.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-sm">
                  <span className={`size-5 rounded border border-line ${c.token}`} />
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CharacterShowcase />

        <CellShowcase />

        <BoardShowcase />

        <TimerShowcase />

        <section className="flex flex-wrap items-center gap-3">
          <Button size="lg">Criar Sala</Button>
          <Button variant="secondary">Entrar com Código</Button>
          <Button variant="danger" size="sm">
            Sair
          </Button>
          <Button variant="ghost" size="sm">
            Como Jogar
          </Button>
          <Button disabled>Desabilitado</Button>
        </section>

        <section className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast({ message: 'Código copiado!' })}
          >
            Toast info
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast({ message: 'Sala 4821 não encontrada', tone: 'danger' })}
          >
            Toast perigo
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast({ message: '+50 Coins', tone: 'coin' })}
          >
            Toast Coins
          </Button>
          <Button variant="secondary" size="sm" onClick={() => flashBanner('turn')}>
            Banner sua vez
          </Button>
          <Button variant="secondary" size="sm" onClick={() => flashBanner('death')}>
            Banner Morte Súbita
          </Button>
        </section>
      </main>

      <Banner
        className="fixed inset-x-0 top-1/2 z-40 -translate-y-1/2"
        show={banner === 'turn'}
        title="Sua vez"
        subtitle="10 segundos"
        color={CHARACTER_INFO.X.color}
      />
      <Banner
        className="fixed inset-x-0 top-1/2 z-40 -translate-y-1/2"
        show={banner === 'death'}
        title="Morte Súbita"
        subtitle="5 segundos por turno"
        tone="danger"
        flicker
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sair da partida?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Continuar
            </Button>
            <Button variant="danger" onClick={() => setModalOpen(false)}>
              Sair
            </Button>
          </>
        }
      >
        O timer continua correndo enquanto este aviso está aberto. Se sair, a partida termina por
        W.O.
      </Modal>
    </>
  )
}
