import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Button, GearIcon, Modal } from '../components/ui'
import { HUB_TEXTS, PROFILE_TEXTS, SETTINGS_TEXTS } from '../constants/texts'
import { Character } from '../features/characters'
import { SettingsModal } from '../features/settings/SettingsModal'
import { useAuthStore } from '../stores/authStore'
import { selectFavoriteCharacter, useProfileStore } from '../stores/profileStore'
import { PATHS } from './paths'

const TABS = [
  { to: PATHS.shop, label: 'Loja' },
  { to: PATHS.play, label: 'Jogar' },
  { to: PATHS.profile, label: 'Perfil' },
]

// Moldura do Hub (FE-06) [RF-HUB-01] [RF-HUB-03]: menu lateral fixo (Loja · Jogar · Perfil, foco em
// Jogar), topo com avatar, apelido e Coins, e Sair com confirmação. Layout do esboço de telas.
export function HubLayout() {
  const loadProfile = useProfileStore((s) => s.loadProfile)

  // Perfil, Coins e inventário a cada vez que o Hub abre (ex: na volta de uma partida) (FE-30)
  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

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
  const [settingsOpen, setSettingsOpen] = useState(false)

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
      {/* Configurações (FE-39): em todas as abas do Hub. Só o ícone, porque o nome não cabe */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-auto"
        aria-label={SETTINGS_TEXTS.title}
        title={SETTINGS_TEXTS.title}
        onClick={() => setSettingsOpen(true)}
      >
        <GearIcon className="size-5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
        Sair
      </Button>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

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

// Apelido, Coins e o personagem equipado vêm do profileStore, confirmados pelo servidor (FE-30)
function HubTopBar() {
  const nickname = useProfileStore((s) => s.profile?.username)
  const coins = useProfileStore((s) => s.coinsBalance)
  const favoriteCharacter = useProfileStore(selectFavoriteCharacter)
  // Só quando o perfil nunca chegou: se uma recarga falhar, o topo fica com o último confirmado
  const neverLoaded = useProfileStore((s) => s.status === 'error' && s.profile === null)
  const loadProfile = useProfileStore((s) => s.loadProfile)
  return (
    <header className="flex items-center gap-3">
      <Character
        id={favoriteCharacter}
        variant="avatar"
        decorative
        className="size-10 short:size-9"
      />
      {neverLoaded ? (
        <>
          <span role="alert" className="min-w-0 truncate text-sm text-danger">
            {PROFILE_TEXTS.loadError}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0"
            onClick={() => void loadProfile()}
          >
            {PROFILE_TEXTS.retry}
          </Button>
        </>
      ) : (
        <>
          <span className="truncate font-display text-lg font-bold tracking-wide short:text-base">
            {nickname ?? PROFILE_TEXTS.loadingNickname}
          </span>
          <span className="ml-auto font-display text-lg font-bold text-coin short:text-base">
            <span className="sr-only">Saldo: </span>
            {coins === null ? '…' : coins.toLocaleString('pt-BR')} Coins
          </span>
        </>
      )}
    </header>
  )
}
