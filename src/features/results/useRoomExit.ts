import { useEffect, useEffectEvent } from 'react'
import { useLanguageFilter } from '../../hooks/useLanguageFilter'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import { rematchCancelledMessage } from './rematch'

/**
 * Chama `onExit` quando a sala acabou para você: o seu pedido de revanche foi cancelado
 * (recusa, tempo ou saída do oponente) [RN-POS-02], ou o servidor encerrou a sala fora do
 * Resultado. No Resultado, quem não pediu continua na tela: o RematchPanel mostra o aviso.
 */
export function useRoomExit(onExit: (message: string) => void) {
  const me = useRoomStore((s) => s.mySlot)
  const phase = useRoomStore((s) => s.phase)
  const closedReason = useRoomStore((s) => s.closedReason)
  const cancelled = useMatchStore((s) => s.rematchCancelled)
  const filterOn = useLanguageFilter()
  const exit = useEffectEvent(onExit)

  let message: string | null = null
  if (cancelled && me !== null && cancelled.requestedBy === me) {
    message = rematchCancelledMessage(cancelled.reason, true, filterOn)
  } else if (closedReason !== null && phase !== 'RESULT') {
    message = closedReason
  }

  useEffect(() => {
    if (message) exit(message)
  }, [message])
}
