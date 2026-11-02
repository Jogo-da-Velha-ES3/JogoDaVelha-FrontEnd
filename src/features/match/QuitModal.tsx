import { Button, Modal } from '../../components/ui'
import { ARENA_TEXTS } from '../../constants/texts'

interface QuitModalProps {
  open: boolean
  /** Volta ao menu de pausa */
  onContinue: () => void
  /** Sai da partida (a Arena volta ao Hub; ao sair, a sala avisa o servidor) */
  onQuit: () => void
}

/**
 * Modal de confirmação de desistência, fiel ao esboço (seção "Modais Globais · Sair/desistir"):
 * card com "DESISTIR?", mensagem de consequência e dois botões (CONTINUAR / DESISTIR).
 * Não fecha no clique fora — o jogador precisa escolher explicitamente.
 * O resultado da desistência é do servidor [A VALIDAR COM O BACK].
 */
export function QuitModal({ open, onContinue, onQuit }: QuitModalProps) {
  return (
    <Modal
      open={open}
      title={<span className="text-danger">{ARENA_TEXTS.quit.title}</span>}
      dismissible={false}
      size="sm"
      actions={
        <div className="flex w-full gap-3">
          <Button variant="ghost" size="sm" block onClick={onContinue}>
            Continuar
          </Button>
          <Button variant="danger" size="sm" block onClick={onQuit}>
            Desistir
          </Button>
        </div>
      }
    >
      <p className="py-2 text-sm text-text-muted">{ARENA_TEXTS.quit.body}</p>
    </Modal>
  )
}
