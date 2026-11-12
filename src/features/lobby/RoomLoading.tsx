// Entrada na sala, antes de o servidor mandar o estado dela (ROOM_SNAPSHOT). Com o back de produção
// acordando, a espera pode levar minutos: o "Voltar ao Hub" fica sempre à mão. Quem decide a tela
// seguinte é o servidor (a `phase` do snapshot); se a conexão falhar, o erro fica na tela.
import { Button, Spinner } from '../../components/ui'
import { ROOM_TEXTS } from '../../constants/texts'

interface RoomLoadingProps {
  code: string
  /** A conexão com a sala falhou: mostra o erro e o "Tentar de novo" no lugar da espera */
  failed: boolean
  onRetry: () => void
  onBack: () => void
}

export function RoomLoading({ code, failed, onRetry, onBack }: RoomLoadingProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center short:gap-3">
      <h1 className="font-display text-4xl font-extrabold tracking-wide text-primary uppercase short:text-3xl">
        {ROOM_TEXTS.title(code)}
      </h1>
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {ROOM_TEXTS.errors.joinFailed}
        </p>
      ) : (
        <Spinner label={ROOM_TEXTS.entering} size="lg" />
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {failed && <Button onClick={onRetry}>{ROOM_TEXTS.retry}</Button>}
        <Button variant={failed ? 'secondary' : 'ghost'} onClick={onBack}>
          {ROOM_TEXTS.backToHub}
        </Button>
      </div>
    </section>
  )
}
