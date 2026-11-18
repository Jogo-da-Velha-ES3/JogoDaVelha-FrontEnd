import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { QuitModal } from '../../features/match'
import { leaveConsequence } from '../../lib/roomExit'
import { useAuthStore } from '../../stores/authStore'
import { useRoomStore } from '../../stores/roomStore'

/**
 * Voltar do navegador (ou o gesto de voltar do Android) dentro da sala (FRT-03). Sair da página
 * manda o `/leave`: na partida é desistência e, no Match feito e na Preparação, fecha a sala do
 * oponente. Por isso o voltar pede confirmação, com o mesmo modal do "Desistir" da pausa.
 *
 * Só o voltar/avançar do histórico (POP) é barrado: as saídas pelos botões do jogo (Desistir,
 * Sair da sala, Voltar ao Lobby) e os redirecionamentos (sala encerrada, sessão vencida) já são
 * escolha do jogador ou do servidor.
 */
export function BackNavigationGuard() {
  const consequence = useRoomStore((s) =>
    s.closedReason === null ? leaveConsequence(s.phase) : null,
  )
  const signedIn = useAuthStore((s) => s.token !== null)
  const guarded = consequence !== null && signedIn
  const blocker = useBlocker(({ historyAction }) => guarded && historyAction === 'POP')

  // A fase mudou com o modal aberto (ex: a partida acabou, a sala fechou): fica onde está
  useEffect(() => {
    if (blocker.state === 'blocked' && !guarded) blocker.reset()
  }, [blocker, guarded])

  return (
    <QuitModal
      open={blocker.state === 'blocked' && guarded}
      variant={consequence === 'CLOSE_ROOM' ? 'closeRoom' : 'forfeit'}
      onContinue={() => blocker.reset?.()}
      onQuit={() => blocker.proceed?.()}
    />
  )
}
