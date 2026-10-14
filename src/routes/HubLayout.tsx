import { NavLink, Outlet } from 'react-router-dom'
import { Button } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import { PATHS } from './paths'

const TABS = [
  { to: PATHS.shop, label: 'Loja' },
  { to: PATHS.play, label: 'Jogar' },
  { to: PATHS.profile, label: 'Perfil' },
]

// Moldura do Hub com as 3 abas [RF-HUB-01]. Menu lateral de verdade, topo e Sair: FE-06 (Vini)
export function HubLayout() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="flex flex-1 gap-4 py-3">
      <nav aria-label="Hub" className="flex w-28 shrink-0 flex-col gap-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              [
                'rounded-xl px-3 py-2 font-display font-bold tracking-wide uppercase',
                isActive ? 'bg-primary text-on-primary' : 'text-text-muted hover:bg-bg-raised',
              ].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
        <Button variant="ghost" size="sm" className="mt-auto" onClick={logout}>
          Sair
        </Button>
      </nav>
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
