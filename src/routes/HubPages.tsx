import { PlayScreen } from '../features/hub/PlayScreen'
import { ShopScreen } from '../features/shop/ShopScreen'
import { PagePlaceholder } from './PagePlaceholder'

export function PlayPage() {
  return <PlayScreen />
}

export function ShopPage() {
  return <ShopScreen />
}

export function ProfilePage() {
  return <PagePlaceholder title="Perfil" card="FE-33" owner="Matheus" />
}
