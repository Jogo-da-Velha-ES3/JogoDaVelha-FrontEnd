import { Button } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import { PagePlaceholder } from './PagePlaceholder'

// Token falso só para navegar enquanto a tela de Acesso não existe — remover na FE-25
const SIMULATED_TOKEN = 'token-simulado-fe-07'

export function AccessPage() {
  const login = useAuthStore((s) => s.login)

  return (
    <PagePlaceholder title="Acesso" card="FE-25" owner="Vini">
      <Button onClick={() => login(SIMULATED_TOKEN)}>Entrar (simulado)</Button>
    </PagePlaceholder>
  )
}
