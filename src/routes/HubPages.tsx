import { PlayScreen } from '../features/hub/PlayScreen'
import { PagePlaceholder } from './PagePlaceholder'

export function PlayPage() {
  return <PlayScreen />
}

export function ShopPage() {
  return <PagePlaceholder title="Loja" card="FE-31" owner="Vini" />
}

export function ProfilePage() {
  return <PagePlaceholder title="Perfil" card="FE-33" owner="Matheus" />
}
