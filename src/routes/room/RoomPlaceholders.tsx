// Telas da sala que ainda são de outros cards. Mostram o mínimo para a partida andar de ponta a
// ponta com o servidor simulado; cada card substitui a sua.
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Preparation } from '../../features/draft/Preparation'
import {
  selectOwnedAbilities,
  selectOwnedCharacters,
  useProfileStore,
} from '../../stores/profileStore'

// Inventário do profileStore (FE-30): só o que o jogador comprou fica liberado. Quem entra direto
// pelo link da sala (sem passar pelo Hub) carrega o perfil aqui; até chegar, só os iniciais.
export function PreparationPlaceholder() {
  const status = useProfileStore((s) => s.status)
  const loadProfile = useProfileStore((s) => s.loadProfile)
  const unlockedCharacters = useProfileStore(useShallow(selectOwnedCharacters))
  const unlockedAbilities = useProfileStore(useShallow(selectOwnedAbilities))

  useEffect(() => {
    if (status === 'idle') void loadProfile()
  }, [status, loadProfile])

  return (
    <Preparation unlockedCharacters={unlockedCharacters} unlockedAbilities={unlockedAbilities} />
  )
}
