import { create } from 'zustand'
import { SERVER_SLOW_SECONDS } from '../constants/game'

interface ServerWakeState {
  /** Chamadas ao servidor sem resposta há mais de SERVER_SLOW_SECONDS */
  slowCalls: number
}

/**
 * Servidor acordando (FE-51). Só interface, como a `toastStore`: não reflete nada do jogo. O back
 * no Render dorme sem uso e leva minutos para acordar; enquanto houver chamada lenta, o
 * `ServerWakeNotice` avisa.
 */
export const useServerWakeStore = create<ServerWakeState>()(() => ({ slowCalls: 0 }))

const addSlowCalls = (delta: number) =>
  useServerWakeStore.setState((s) => ({ slowCalls: Math.max(0, s.slowCalls + delta) }))

/**
 * Acompanha uma chamada ao servidor: se ela passar de SERVER_SLOW_SECONDS sem resposta, conta como
 * lenta até terminar, com sucesso ou erro. Não corta nem muda a chamada: devolve o mesmo resultado.
 */
export async function watchServerCall<T>(call: Promise<T>): Promise<T> {
  let slow = false
  const timer = setTimeout(() => {
    slow = true
    addSlowCalls(1)
  }, SERVER_SLOW_SECONDS * 1000)
  try {
    return await call
  } finally {
    clearTimeout(timer)
    if (slow) addSlowCalls(-1)
  }
}
