import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveRoomCheck } from '../api/rooms'

vi.mock('../api/rooms', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/rooms')>()
  return { ...original, checkActiveRoom: vi.fn<typeof original.checkActiveRoom>() }
})

import { checkActiveRoom } from '../api/rooms'
import {
  checkActiveRoomOnStartup,
  clearActiveRoom,
  markRoomOpened,
  showActiveRoom,
  useActiveRoomStore,
} from './activeRoomStore'
import { useAuthStore } from './authStore'

const ROOM = { code: '4821', phase: 'PLAYING', canReturn: true } as const
const found: ActiveRoomCheck = { status: 'FOUND', room: ROOM }

beforeEach(() => {
  useAuthStore.setState({ token: 'token' })
  useActiveRoomStore.setState({ room: null, startupChecked: false })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('pergunta da abertura do jogo (AMB-01)', () => {
  it('pergunta uma vez só e mostra a sala em que o jogador ainda está', async () => {
    vi.mocked(checkActiveRoom).mockResolvedValue(found)
    await checkActiveRoomOnStartup()
    await checkActiveRoomOnStartup()

    expect(checkActiveRoom).toHaveBeenCalledTimes(1)
    expect(useActiveRoomStore.getState().room).toEqual(ROOM)
  })

  it.each([
    ['nenhuma sala', { status: 'NONE' }],
    ['sem resposta', { status: 'UNKNOWN' }],
  ] as const)('%s: nenhum aviso', async (_, check) => {
    vi.mocked(checkActiveRoom).mockResolvedValueOnce(check)
    await checkActiveRoomOnStartup()
    expect(useActiveRoomStore.getState().room).toBeNull()
  })

  it('quem abriu uma sala neste carregamento não é perguntado', async () => {
    markRoomOpened()
    await checkActiveRoomOnStartup()
    expect(checkActiveRoom).not.toHaveBeenCalled()
  })

  it('abriu uma sala enquanto a resposta não vinha: a resposta antiga não mostra o aviso', async () => {
    let answer: (check: ActiveRoomCheck) => void = () => {}
    vi.mocked(checkActiveRoom).mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    const pending = checkActiveRoomOnStartup()
    markRoomOpened()
    answer(found)
    await pending
    expect(useActiveRoomStore.getState().room).toBeNull()
  })

  it('sair da conta: a próxima conta é perguntada de novo, sem o aviso da anterior', async () => {
    vi.mocked(checkActiveRoom).mockResolvedValue(found)
    await checkActiveRoomOnStartup()
    useAuthStore.setState({ token: null })
    expect(useActiveRoomStore.getState()).toMatchObject({ room: null, startupChecked: false })

    useAuthStore.setState({ token: 'outro' })
    await checkActiveRoomOnStartup()
    expect(checkActiveRoom).toHaveBeenCalledTimes(2)
  })
})

describe('aviso da sala', () => {
  it('clearActiveRoom com código só tira o aviso dessa sala', () => {
    showActiveRoom(ROOM)
    clearActiveRoom('1234')
    expect(useActiveRoomStore.getState().room).toEqual(ROOM)
    clearActiveRoom('4821')
    expect(useActiveRoomStore.getState().room).toBeNull()
  })

  it('abrir a tela de uma sala tira o aviso', () => {
    showActiveRoom(ROOM)
    markRoomOpened()
    expect(useActiveRoomStore.getState().room).toBeNull()
  })
})
