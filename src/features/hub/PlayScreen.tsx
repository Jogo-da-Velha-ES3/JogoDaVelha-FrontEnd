// Aba Jogar do Hub (FE-06) [RF-HUB-02] [RF-HUB-04] [RF-HUB-05] [RF-HUB-06].
// Layout do esboço: personagem favorito à esquerda; marca e botões à direita.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../../api/rooms'
import { ApiError } from '../../api/client'
import { Button, Logo } from '../../components/ui'
import { ROOM_TEXTS } from '../../constants/texts'
import { enterGameFullscreen } from '../../pwa/gameFullscreen'
import { JOINED_ROOM_STATE, roomPath } from '../../routes/paths'
import { selectFavoriteCharacter, useProfileStore } from '../../stores/profileStore'
import { showToast } from '../../stores/toastStore'
import { Character } from '../characters'
import { HowToPlayModal } from './HowToPlayModal'
import { InstallAppButton } from './InstallAppButton'
import { JoinRoomModal } from './JoinRoomModal'

export function PlayScreen() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [howToPlayOpen, setHowToPlayOpen] = useState(false)
  const favoriteCharacter = useProfileStore(selectFavoriteCharacter)

  async function handleCreateRoom() {
    if (creating) return
    setCreating(true)
    try {
      // Só vai para a sala com o código que o servidor devolveu
      const room = await createRoom()
      navigate(roomPath(room.code), { state: JOINED_ROOM_STATE })
    } catch (error) {
      showToast({
        tone: 'danger',
        message: error instanceof ApiError ? error.message : ROOM_TEXTS.errors.createFailed,
      })
      setCreating(false)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 items-center gap-6 py-2 short:gap-4 short:py-0 tall:max-w-6xl tall:gap-12">
      <div className="flex flex-1 items-center justify-center">
        <Character
          id={favoriteCharacter}
          variant="full"
          animated
          className="aspect-[160/170] h-52 sm:h-64 short:h-40 tall:h-80"
        />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3 short:gap-2 tall:gap-5">
        <Logo className="justify-center" />

        <Button
          size="lg"
          block
          disabled={creating}
          onClick={() => {
            // Android: tela cheia já no toque, antes de esperar o servidor (FRT-02)
            enterGameFullscreen()
            void handleCreateRoom()
          }}
        >
          {creating ? 'Criando sala…' : 'Criar sala'}
        </Button>
        <Button variant="secondary" block onClick={() => setJoinOpen(true)}>
          Entrar com código
        </Button>
        {/* Instalar app some quando já está instalado ou o navegador não instala sites (FE-16) */}
        <div className="flex gap-2 tall:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => setHowToPlayOpen(true)}
          >
            Como jogar
          </Button>
          <InstallAppButton className="flex-1" />
        </div>
      </div>

      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <HowToPlayModal open={howToPlayOpen} onClose={() => setHowToPlayOpen(false)} />
    </section>
  )
}
