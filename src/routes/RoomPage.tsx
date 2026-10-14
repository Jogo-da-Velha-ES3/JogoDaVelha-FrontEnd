import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { isValidRoomCode } from '../lib/roomCode'
import { useRoomStore } from '../stores/roomStore'
import { NotFoundPage } from './NotFoundPage'
import { PagePlaceholder } from './PagePlaceholder'

// Sala de Espera, Preparação, Arena e Resultado: a tela sai do `phase` do snapshot (FE-28)
export function RoomPage() {
  const { codigo } = useParams()
  const setPendingRoomCode = useRoomStore((s) => s.setPendingRoomCode)
  const isValid = isValidRoomCode(codigo)

  // Chegou na sala: o link direto guardado antes do Acesso já foi usado
  useEffect(() => {
    if (isValid) setPendingRoomCode(null)
  }, [isValid, setPendingRoomCode])

  if (!isValid) return <NotFoundPage />

  return <PagePlaceholder title={`Sala ${codigo}`} card="FE-26 / FE-28" owner="Vini e Rafael" />
}
