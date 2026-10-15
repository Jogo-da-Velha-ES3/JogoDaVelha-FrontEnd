import type { RouteObject } from 'react-router-dom'
import { AccessPage } from './AccessPage'
import { RequireAuth, RequireGuest } from './guards'
import { HubLayout } from './HubLayout'
import { PlayPage, ProfilePage, ShopPage } from './HubPages'
import { NotFoundPage } from './NotFoundPage'
import { PATHS } from './paths'
import { ResetPasswordPage } from './ResetPasswordPage'
import { RoomPage } from './RoomPage'

// Rotas da aplicação — docs/ARCHITECTURE.md §2
export const routes: RouteObject[] = [
  {
    element: <RequireGuest />,
    children: [{ path: PATHS.access, element: <AccessPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <HubLayout />,
        children: [
          { path: PATHS.play, element: <PlayPage /> },
          { path: PATHS.shop, element: <ShopPage /> },
          { path: PATHS.profile, element: <ProfilePage /> },
        ],
      },
      { path: PATHS.room, element: <RoomPage /> },
    ],
  },
  // Livres: o link do e-mail pode ser aberto logado ou não; a vitrine é consulta do time
  { path: PATHS.resetPassword, element: <ResetPasswordPage /> },
  // Carregada sob demanda: só o time usa, e ela traz todas as demonstrações
  {
    path: PATHS.showcase,
    lazy: async () => ({ Component: (await import('./vitrine/ShowcasePage')).ShowcasePage }),
  },
  { path: '*', element: <NotFoundPage /> },
]
