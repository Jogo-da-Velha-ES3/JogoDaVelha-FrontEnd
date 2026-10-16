import { Button, Modal } from '../../components/ui'

// TODO: substituir pelo conteúdo real de Como Jogar (modal navegável com 4 páginas)
// Referência: esboço seção "Modais globais" → miniatura "Como jogar: 4 páginas"

interface HowToPlayModalProps {
  open: boolean
  /** Fecha o modal E volta ao menu de pausa */
  onClose: () => void
}

/**
 * Modal "Como Jogar" — placeholder.
 * O conteúdo real será um guia navegável de regras (4 páginas com dots de paginação).
 */
export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Como Jogar"
      dismissible
      size="md"
      actions={
        <div className="flex w-full gap-3">
          {/* TODO: implementar navegação entre páginas (PRÓXIMO / ANTERIOR) */}
          <Button variant="ghost" size="sm" block onClick={onClose}>
            ← Voltar ao menu
          </Button>
          <Button variant="secondary" size="sm" block disabled>
            Próximo
          </Button>
        </div>
      }
    >
      {/* Conteúdo placeholder */}
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-text-muted">
          {/* TODO: substituir por conteúdo real: regras do tabuleiro 4×4, habilidades, MD3 */}
          Conteúdo em construção — as regras completas vão aparecer aqui em breve.
        </p>

        {/* Dots de paginação — placeholder visual */}
        <div className="flex justify-center gap-2" aria-hidden="true">
          <span className="size-2 rounded-full bg-primary" />
          <span className="size-2 rounded-full bg-bg-raised" />
          <span className="size-2 rounded-full bg-bg-raised" />
          <span className="size-2 rounded-full bg-bg-raised" />
        </div>
      </div>
    </Modal>
  )
}
