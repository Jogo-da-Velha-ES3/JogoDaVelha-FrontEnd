import { useSearchParams } from 'react-router-dom'
import { PlayScreen } from '../features/hub/PlayScreen'
import { ProfileScreen } from '../features/profile/ProfileScreen'
import { ShopScreen } from '../features/shop/ShopScreen'
import { SHOP_TAB_PARAM } from './paths'

export function PlayPage() {
  return <PlayScreen />
}

/** `/loja?categoria=skills` já abre na aba Habilidades (link dos itens bloqueados do Perfil) */
export function ShopPage() {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get(SHOP_TAB_PARAM)
  const initialTab = tab === 'skills' ? 'skills' : 'characters'
  return <ShopScreen key={initialTab} initialTab={initialTab} />
}

export function ProfilePage() {
  return <ProfileScreen />
}
