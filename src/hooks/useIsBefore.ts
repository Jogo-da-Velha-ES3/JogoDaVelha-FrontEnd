import { useEffect, useState } from 'react'

/**
 * true enquanto o relógio do aparelho não passou de `deadline` (ms). Re-renderiza sozinho quando
 * o prazo vence. Ex: segurar a Arena por 2s depois de um W.O.
 */
export function useIsBefore(deadline: number | null): boolean {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (deadline === null) return
    const id = setTimeout(() => setNow(Date.now()), Math.max(deadline - Date.now(), 0))
    return () => clearTimeout(id)
  }, [deadline])

  return deadline !== null && now < deadline
}
