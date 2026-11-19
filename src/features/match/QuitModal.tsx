import { Button, Modal } from '../../components/ui'
import { ARENA_TEXTS } from '../../constants/texts'

interface QuitModalProps {
  open: boolean
  /** Volta ao menu de pausa (ou fica na sala, no voltar do navegador) */
  onContinue: () => void
  /** Sai da partida (a Arena volta ao Hub; ao sair, a sala avisa o servidor) */
  onQuit: () => void
  /**
   * `closeRoom`: no Match feito e na Preparação, sair fecha a sala sem partida (FRT-03).
   * Padrão: na partida, sair é desistência
   */
  variant?: 'forfeit' | 'closeRoom'
}

/**
 * Modal de confirmação de desistência, fiel ao esboço (seção "Modais Globais · Sair/desistir"):
 * card com "DESISTIR?", mensagem de consequência e dois botões (CONTINUAR / DESISTIR).
 * Não fecha no clique fora — o jogador precisa escolher explicitamente.
 * O resultado da desistência é do servidor: o `/leave` vira W.O. para o oponente.
 */
export function QuitModal({ open, onContinue, onQuit, variant = 'forfeit' }: QuitModalProps) {
  const texts = variant === 'closeRoom' ? ARENA_TEXTS.leaveRoom : ARENA_TEXTS.quit
  return (
    <Modal
      open={open}
      title={<span className="text-danger">{texts.title}</span>}
      dismissible={false}
      size="sm"
      actions={
        <div className="flex w-full gap-3">
          <Button variant="ghost" size="sm" block onClick={onContinue}>
            Continuar
          </Button>
          <Button variant="danger" size="sm" block onClick={onQuit}>
            {variant === 'closeRoom' ? 'Sair' : 'Desistir'}
          </Button>
        </div>
      }
    >
      <p className="py-2 text-sm text-text-muted tall:text-lg">{texts.body}</p>
    </Modal>
  )
}
