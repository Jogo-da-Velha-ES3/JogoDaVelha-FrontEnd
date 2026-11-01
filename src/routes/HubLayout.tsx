import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Button, Modal } from '../components/ui'
import { HUB_TEXTS } from '../constants/texts'
import { Character } from '../features/characters'
import { HUB_PLACEHOLDER_PROFILE } from '../features/hub/placeholderProfile'
import { useAuthStore } from '../stores/authStore'
import { PATHS } from './paths'

const TABS = [
  { to: PATHS.shop, label: 'Loja' },
  { to: PATHS.play, label: 'Jogar' },
  { to: PATHS.profile, label: 'Perfil' },
]

// Moldura do Hub (FE-06) [RF-HUB-01] [RF-HUB-03]: menu lateral fixo (Loja · Jogar · Perfil, foco em
// Jogar), topo com avatar, apelido e Coins, e Sair com confirmação. Layout do esboço de telas.
export function HubLayout() {
  return (
    <div className="flex flex-1 gap-4 py-3 short:gap-3 short:py-2">
      <HubNav />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <HubTopBar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function HubNav() {
  const logout = useAuthStore((s) => s.logout)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <nav aria-label="Hub" className="flex w-24 shrink-0 flex-col gap-2 short:w-20 short:gap-1.5">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            [
              'rounded-xl px-3 py-2 text-center font-display font-bold tracking-wide uppercase short:py-1.5',
              isActive
                ? 'bg-primary text-on-primary shadow-glow shadow-primary/30'
                : 'text-text-muted hover:bg-bg-raised hover:text-primary',
            ].join(' ')
          }
        >
          {tab.label}
        </NavLink>
      ))}
      <Button variant="ghost" size="sm" className="mt-auto" onClick={() => setConfirmOpen(true)}>
        Sair
      </Button>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={HUB_TEXTS.logoutTitle}
        size="sm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            {/* Sair só apaga o token deste aparelho; a guarda leva ao Acesso */}
            <Button variant="danger" onClick={logout}>
              Sair da conta
            </Button>
          </>
        }
      >
        {HUB_TEXTS.logoutBody}
      </Modal>
    </nav>
  )
}

// Valores fixos até a FE-30 (GET /me); editar o apelido também chega com ela (PATCH /me)
function HubTopBar() {
  const { nickname, coins, favoriteCharacter } = HUB_PLACEHOLDER_PROFILE
  return (
    <header className="flex items-center gap-3">
      <Character
        id={favoriteCharacter}
        variant="avatar"
        decorative
        className="size-10 short:size-9"
      />
      <span className="truncate font-display text-lg font-bold tracking-wide short:text-base">
        {nickname}
      </span>
      <span className="ml-auto font-display text-lg font-bold text-coin short:text-base">
        <span className="sr-only">Saldo: </span>
        {coins.toLocaleString('pt-BR')} Coins
      </span>
    </header>
  )
}
