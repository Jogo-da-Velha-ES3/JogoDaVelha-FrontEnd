import { useEffect } from 'react'
import { AccessScreen } from '../features/auth/AccessScreen'
import { playMusic } from '../features/sound/soundManager'

/** /entrar — sem sessão, toda rota cai aqui (RequireAuth) */
export function AccessPage() {
  useEffect(() => {
    playMusic('trilha-hub')
  }, [])

  return <AccessScreen />
}
