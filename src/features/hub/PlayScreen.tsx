// Aba Jogar do Hub (FE-06) [RF-HUB-02] [RF-HUB-04] [RF-HUB-05] [RF-HUB-06].
// Layout do esboço: personagem favorito à esquerda; marca e botões à direita.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../../api/rooms'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui'
import { roomPath } from '../../routes/paths'
import { showToast } from '../../stores/toastStore'
import { Character } from '../characters'
import { HowToPlayModal } from './HowToPlayModal'
import { JoinRoomModal } from './JoinRoomModal'
import { HUB_PLACEHOLDER_PROFILE } from './placeholderProfile'

export function PlayScreen() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [howToPlayOpen, setHowToPlayOpen] = useState(false)

  async function handleCreateRoom() {
    if (creating) return
    setCreating(true)
    try {
      // Só vai para a sala com o código que o servidor devolveu
      const room = await createRoom()
      navigate(roomPath(room.code))
    } catch (error) {
      showToast({
        tone: 'danger',
        message: error instanceof ApiError ? error.message : 'Não foi possível criar a sala agora.',
      })
      setCreating(false)
    }
  }

  return (
    <section className="flex flex-1 items-center gap-6 py-2 short:gap-4 short:py-0">
      <div className="flex flex-1 items-center justify-center">
        <Character
          id={HUB_PLACEHOLDER_PROFILE.favoriteCharacter}
          variant="full"
          animated
          className="aspect-[160/170] h-52 sm:h-64 short:h-40"
        />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3 short:gap-2">
        <div className="flex items-center justify-center gap-2">
          {/* Espaço do logo com a carinha do Vitão: a arte vem com a FE-41 (flag desligada) */}
          <div
            aria-hidden
            className="grid size-9 place-items-center rounded-full border-2 border-dashed border-line font-mono text-[8px] text-text-muted"
          >
            logo
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-wide text-primary uppercase short:text-xl">
            Jogo do Velho
          </h1>
        </div>

        <Button size="lg" block disabled={creating} onClick={() => void handleCreateRoom()}>
          {creating ? 'Criando sala…' : 'Criar sala'}
        </Button>
        <Button variant="secondary" block onClick={() => setJoinOpen(true)}>
          Entrar com código
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" onClick={() => setHowToPlayOpen(true)}>
            Como jogar
          </Button>
          {/* Instalar App é a FE-16 (PWA): o gatilho de instalação entra lá */}
          <Button variant="ghost" size="sm" disabled title="Chega com a FE-16">
            Instalar app
          </Button>
        </div>
      </div>

      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <HowToPlayModal open={howToPlayOpen} onClose={() => setHowToPlayOpen(false)} />
    </section>
  )
}
