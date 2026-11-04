import { PlayScreen } from '../features/hub/PlayScreen'
import { ShopScreen } from '../features/shop/ShopScreen'
import { ProfileScreen } from '../features/profile/ProfileScreen'
import { useSearchParams } from 'react-router-dom'

export function PlayPage() {
  return <PlayScreen />
}

export function ShopPage() {
  const [searchParams] = useSearchParams()
  const category = searchParams.get('categoria')
  const initialTab = category === 'skills' || category === 'characters' ? category : 'characters'
  return <ShopScreen key={initialTab} initialTab={initialTab} />
}

export function ProfilePage() {
  return <ProfileScreen />
}
