import { useState } from 'react'
import { Banner, Button, Modal } from '../../components/ui'
import { CHARACTER_INFO } from '../../constants/characters'
import { CHARACTERS } from '../../constants/game'
import { showToast } from '../../stores/toastStore'
import { ShowcaseBlock } from './ShowcaseLayout'
import { TimerShowcase } from './TimerShowcase'

const SYSTEM_COLORS = [
  { name: 'Perigo', token: 'bg-danger', use: 'erros, Morte Súbita, W.O.' },
  { name: 'Coins', token: 'bg-coin', use: 'saldo e recompensas' },
  { name: 'Botão', token: 'bg-primary', use: 'botões principais' },
  { name: 'Gelo', token: 'bg-ice', use: 'peça congelada' },
  { name: 'Painel', token: 'bg-bg-panel', use: 'fundo de cartões' },
  { name: 'Elevado', token: 'bg-bg-raised', use: 'fundo de destaque' },
]

// Cores, botões, modal, avisos, banners e timer (FE-23 e FE-08)
export function ComponentsShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [banner, setBanner] = useState<'turn' | 'death' | null>(null)

  const flashBanner = (kind: 'turn' | 'death') => {
    setBanner(kind)
    setTimeout(() => setBanner(null), 1800)
  }

  return (
    <div className="flex flex-col gap-4">
      <ShowcaseBlock
        title="Cores"
        hint="Cada jogador usa a cor do próprio personagem. O vermelho é só para perigo."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="flex flex-wrap gap-2">
            {CHARACTERS.map((id) => (
              <li
                key={id}
                className="rounded-lg border-2 px-3 py-1 font-display font-bold uppercase"
                style={{ borderColor: CHARACTER_INFO[id].color, color: CHARACTER_INFO[id].color }}
              >
                {CHARACTER_INFO[id].name}
              </li>
            ))}
          </ul>
          <ul className="grid grid-cols-2 gap-2">
            {SYSTEM_COLORS.map((c) => (
              <li key={c.name} className="flex items-center gap-2 text-sm">
                <span className={`size-5 shrink-0 rounded border border-line ${c.token}`} />
                <span>
                  {c.name} <span className="text-xs text-text-muted">· {c.use}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Botões"
        hint="As 4 variantes e os 3 tamanhos, além do estado desabilitado."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Criar Sala</Button>
          <Button variant="secondary">Entrar com Código</Button>
          <Button variant="danger" size="sm">
            Sair
          </Button>
          <Button variant="ghost" size="sm">
            Como Jogar
          </Button>
          <Button disabled>Desabilitado</Button>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Modal, avisos e banners"
        hint="Toque nos botões para ver cada um. O modal fecha no X, no Esc ou tocando fora."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast({ message: 'Código copiado!' })}
          >
            Aviso comum
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast({ message: 'Sala 4821 não encontrada', tone: 'danger' })}
          >
            Aviso de erro
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast({ message: '+50 Coins', tone: 'coin' })}
          >
            Aviso de Coins
          </Button>
          <Button variant="secondary" size="sm" onClick={() => flashBanner('turn')}>
            Banner "Sua vez"
          </Button>
          <Button variant="secondary" size="sm" onClick={() => flashBanner('death')}>
            Banner "Morte Súbita"
          </Button>
        </div>
      </ShowcaseBlock>

      <TimerShowcase />

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
    </div>
  )
}
