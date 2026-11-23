// Sala em que o servidor diz que o jogador ainda está (`GET /rooms/active`, AMB-01). Enquanto houver
// uma, o Hub mostra o aviso com voltar ou sair. Só muda com a resposta do servidor.
import { create } from 'zustand'
import { checkActiveRoom } from '../api/rooms'
import type { ActiveRoom } from '../lib/activeRoom'
import { useAuthStore } from './authStore'

interface ActiveRoomState {
  room: ActiveRoom | null
  /**
   * A pergunta da abertura do jogo já foi feita, ou não precisa: o jogador abriu uma sala neste
   * carregamento, e a saída dela já confere se ele ficou livre (features/lobby/roomRelease.ts)
   */
  startupChecked: boolean
}

const INITIAL_ACTIVE_ROOM_STATE: ActiveRoomState = { room: null, startupChecked: false }

export const useActiveRoomStore = create<ActiveRoomState>()(() => INITIAL_ACTIVE_ROOM_STATE)

/** Muda a cada sala aberta e a cada saída da conta: uma resposta antiga não mostra o aviso */
let generation = 0

export function showActiveRoom(room: ActiveRoom) {
  useActiveRoomStore.setState({ room })
}

/** Tira o aviso; com `code`, só se ele for dessa sala */
export function clearActiveRoom(code?: string) {
  const { room } = useActiveRoomStore.getState()
  if (room && (code === undefined || room.code === code))
    useActiveRoomStore.setState({ room: null })
}

/** O jogador abriu a tela de uma sala: o aviso e a pergunta da abertura ficam para trás */
export function markRoomOpened() {
  generation += 1
  useActiveRoomStore.setState({ room: null, startupChecked: true })
}

/**
 * Ao abrir o jogo no Hub (o app instalado sempre abre no `/`) e depois de entrar na conta, pergunta
 * uma vez se o jogador ainda está numa sala. Não pergunta na volta de uma sala no mesmo
 * carregamento: o `/leave` pode não ter sido processado, e o aviso ofereceria a sala recém-deixada.
 * Sem resposta, o Hub segue normal.
 */
export async function checkActiveRoomOnStartup() {
  if (useActiveRoomStore.getState().startupChecked) return
  useActiveRoomStore.setState({ startupChecked: true })
  const asked = generation
  const check = await checkActiveRoom()
  if (check.status === 'FOUND' && asked === generation) showActiveRoom(check.room)
}

// Sair da conta (ou a sessão vencer): a próxima conta pergunta de novo
useAuthStore.subscribe((state, previous) => {
  if (previous.token !== null && state.token === null) {
    generation += 1
    useActiveRoomStore.setState(INITIAL_ACTIVE_ROOM_STATE, true)
  }
})
