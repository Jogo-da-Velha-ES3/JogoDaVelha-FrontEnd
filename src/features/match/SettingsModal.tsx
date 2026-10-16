import { Button, Modal } from '../../components/ui'

// TODO: implementar configurações reais (som, vibração, Vitão)
// Referência: esboço seção "Modais globais" → miniatura "Configurações"
// Opções planejadas: Música (slider), Efeitos (slider), Vibração (toggle),
//   Comentários do Vitão (toggle, oculto se VITAO_ENABLED=false),
//   Linguagem sem filtro (toggle, oculto se VITAO_ENABLED=false)

interface SettingsModalProps {
  open: boolean
  /** Fecha o modal E volta ao menu de pausa */
  onClose: () => void
}

/**
 * Modal de Configurações — placeholder.
 * A implementação real fica para quando a store de preferências do usuário estiver pronta.
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurações"
      dismissible
      size="sm"
      actions={
        <Button variant="ghost" size="sm" onClick={onClose}>
          ← Voltar ao menu
        </Button>
      }
    >
      <p className="py-2 text-sm text-text-muted">Configurações em construção.</p>
    </Modal>
  )
}
