import { useCallback, useEffect, useRef, useState } from 'react'
import { sendCommand } from '../sockets/gameClient'
import { useRoomStore } from '../stores/roomStore'
import type { ClientCommand } from '../types/events'

/**
 * Intenção mandada ao servidor e ainda sem resposta (AMB-02): o botão trava com "…ando" em vez de
 * aceitar um segundo toque, que o back recusaria com erro. É só interface: o estado do jogo
 * continua mudando apenas com a resposta do servidor.
 *
 * A resposta é qualquer mudança em `answer` (um retrato, em texto, do que o servidor confirma
 * para aquela ação) ou um erro novo na sala; a partir daí o botão volta. Mesmo padrão do sorteio
 * (`DrawPicker`) e da mira (`useAbilityAim`).
 */
export function usePendingIntent<Kind extends string>(answer: string) {
  const lastError = useRoomStore((s) => s.lastError)
  const [sent, setSent] = useState<{
    kind: Kind
    answer: string
    error: typeof lastError
  } | null>(null)
  const pending: Kind | null =
    sent !== null && sent.answer === answer && sent.error === lastError ? sent.kind : null

  // `send` não muda entre renders (dá para chamar de um efeito): lê o momento atual pelas refs
  const current = useRef({ answer, pending })
  useEffect(() => {
    current.current = { answer, pending }
  })

  const send = useCallback((kind: Kind, command: ClientCommand) => {
    if (current.current.pending) return
    setSent({ kind, answer: current.current.answer, error: useRoomStore.getState().lastError })
    current.current = { ...current.current, pending: kind }
    sendCommand(command)
  }, [])

  return { pending, send }
}
