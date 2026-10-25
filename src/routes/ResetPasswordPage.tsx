import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen'
import { PATHS } from './paths'

/** /redefinir-senha — aberta pelo link do e-mail de recuperação (`?token=...`) */
export function ResetPasswordPage() {
  const { search } = useLocation()
  const navigate = useNavigate()
  // Lido uma vez, na primeira renderização: depois a URL é limpa e o token só existe aqui
  const [token] = useState(() => new URLSearchParams(search).get('token') ?? '')

  // Tira o token do endereço (histórico, compartilhamento de tela). Recarregar a página depois
  // disso cai em "link inválido", e o jogador pede outro link.
  useEffect(() => {
    if (search) navigate(PATHS.resetPassword, { replace: true })
  }, [search, navigate])

  return <ResetPasswordScreen token={token} />
}
