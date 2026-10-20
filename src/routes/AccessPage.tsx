import { AccessScreen } from '../features/auth/AccessScreen'

/** /entrar — sem sessão, toda rota cai aqui (RequireAuth) */
export function AccessPage() {
  return <AccessScreen />
}
