import { useEffect } from 'react'
import { matchPath, Navigate, Outlet, useLocation } from 'react-router-dom'
import { isValidRoomCode } from '../lib/roomCode'
import { selectIsAuthenticated, useAuthStore } from '../stores/authStore'
import { useRoomStore } from '../stores/roomStore'
import { PATHS, roomPath } from './paths'

/** Rotas que exigem sessão. Sem login → /entrar, guardando o código de um link de sala. */
export function RequireAuth() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const setPendingRoomCode = useRoomStore((s) => s.setPendingRoomCode)
  const { pathname } = useLocation()

  const code = matchPath(PATHS.room, pathname)?.params.codigo
  const codeToKeep = !isAuthenticated && isValidRoomCode(code) ? code : null

  useEffect(() => {
    if (codeToKeep) setPendingRoomCode(codeToKeep)
  }, [codeToKeep, setPendingRoomCode])

  if (!isAuthenticated) return <Navigate to={PATHS.access} replace />
  return <Outlet />
}

/** Rotas só para quem não está logado (Acesso). Com sessão → sala pendente ou Hub. */
export function RequireGuest() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const pendingRoomCode = useRoomStore((s) => s.pendingRoomCode)

  if (isAuthenticated) {
    return <Navigate to={pendingRoomCode ? roomPath(pendingRoomCode) : PATHS.play} replace />
  }
  return <Outlet />
}
