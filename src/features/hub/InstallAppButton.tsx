// Botão "Instalar App" do Hub (FE-16) [RF-HUB-06]. Chrome/Edge/Android: abre a janela de instalação
// do navegador. iPhone/iPad: não existe essa janela, então mostra o passo a passo do Safari.
// Já instalado, ou num navegador que não instala sites (ex: Firefox no computador): o botão some.
import { useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { showToast } from '../../stores/toastStore'

export function InstallAppButton({ className = '' }: { className?: string }) {
  const { method, install } = useInstallPrompt()
  const [iosHelpOpen, setIosHelpOpen] = useState(false)

  if (method === 'installed' || method === 'unavailable') return null

  async function handleClick() {
    if (method === 'ios') {
      setIosHelpOpen(true)
      return
    }
    const outcome = await install()
    if (outcome === 'accepted') {
      showToast({ message: 'Jogo instalado! Ele já está na sua tela inicial.' })
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className={className} onClick={() => void handleClick()}>
        Instalar app
      </Button>
      <IosInstallModal open={iosHelpOpen} onClose={() => setIosHelpOpen(false)} />
    </>
  )
}

const IOS_STEPS = [
  {
    title: 'Toque em Compartilhar',
    detail: 'É o quadrado com a seta para cima, na barra do navegador.',
  },
  { title: 'Escolha "Adicionar à Tela de Início"', detail: 'Se não aparecer, role a lista.' },
  {
    title: 'Toque em "Adicionar"',
    detail: 'O Jogo do Velho aparece na tela inicial e abre em tela cheia.',
  },
]

function IosInstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Instalar o jogo"
      size="sm"
      actions={<Button onClick={onClose}>Entendi</Button>}
    >
      <ol className="flex flex-col gap-2 short:gap-1.5">
        {IOS_STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-primary/60 font-display font-bold text-primary"
            >
              {i + 1}
            </span>
            <div className="flex flex-col">
              <b className="text-text">{step.title}</b>
              <span className="text-sm">{step.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
