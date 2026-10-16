import { useState } from 'react'
import { Button, Modal } from '../../components/ui'

interface QuitModalProps {
  open: boolean
  /** Volta ao menu de pausa */
  onContinue: () => void
  onQuit: () => void
}

/**
 * Modal de confirmação de desistência, fiel ao esboço (seção "Modais Globais · Sair/desistir"):
 * card com "DESISTIR?", mensagem de consequência e dois botões (CONTINUAR / DESISTIR).
 * Não fecha no clique fora — o jogador precisa escolher explicitamente.
 *
 * O botão DESISTIR mostra "ainda não implementado" em vez de executar a ação,
 * porque a navegação para Resultado pós-W.O. pertence à FE-13.
 */
export function QuitModal({ open, onContinue }: QuitModalProps) {
  const [showNotImplemented, setShowNotImplemented] = useState(false)

  const handleQuit = () => {
    // TODO FE-13: implementar desistência real — sendCommand({ type: 'LEAVE' }) e navegar para Resultado
    setShowNotImplemented(true)
  }

  const handleContinue = () => {
    setShowNotImplemented(false)
    onContinue()
  }

  return (
    <Modal
      open={open}
      title={<span className="text-danger">Desistir?</span>}
      dismissible={false}
      size="sm"
      actions={
        <div className="flex w-full gap-3">
          <Button variant="ghost" size="sm" block onClick={handleContinue}>
            Continuar
          </Button>
          <Button variant="danger" size="sm" block onClick={handleQuit}>
            Desistir
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 py-2">
        <p className="text-sm text-text-muted">
          A partida conta como derrota e o oponente vence por W.O.
        </p>
        {showNotImplemented && (
          <p className="rounded-lg border border-line bg-bg-raised px-3 py-2 font-mono text-xs text-text-muted">
            ⚙ Funcionalidade ainda não implementada.
          </p>
        )}
      </div>
    </Modal>
  )
}
