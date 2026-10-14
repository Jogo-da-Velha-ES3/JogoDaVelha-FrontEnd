import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { PATHS } from './paths'

/** Rota inexistente ou sala com código inválido */
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center short:gap-3 short:py-3">
      <h1 className="font-display text-4xl font-extrabold tracking-wide text-primary uppercase short:text-3xl">
        Página não encontrada
      </h1>
      <p className="text-text-muted">Esse endereço não existe ou o link da sala está errado.</p>
      <Button onClick={() => navigate(PATHS.play, { replace: true })}>Voltar ao Hub</Button>
    </section>
  )
}
