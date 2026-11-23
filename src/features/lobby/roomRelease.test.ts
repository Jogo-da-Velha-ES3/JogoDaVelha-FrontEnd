import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import type { ActiveRoomCheck } from '../../api/rooms'
import type { ActiveRoom } from '../../lib/activeRoom'

vi.mock('../../api/rooms', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/rooms')>()
  return {
    ...original,
    checkActiveRoom: vi.fn<typeof original.checkActiveRoom>(),
    leaveWaitingRoom: vi.fn<typeof original.leaveWaitingRoom>(),
  }
})

vi.mock('../../sockets/gameClient', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../sockets/gameClient')>()
  return { ...original, sendLeaveFromOutside: vi.fn<typeof original.sendLeaveFromOutside>() }
})

import { checkActiveRoom, leaveWaitingRoom } from '../../api/rooms'
import { sendLeaveFromOutside } from '../../sockets/gameClient'
import { showActiveRoom, useActiveRoomStore } from '../../stores/activeRoomStore'
import { leaveActiveRoom, roomScreenClosed, roomScreenOpened } from './roomRelease'

const room = (phase: ActiveRoom['phase'], code = '4821'): ActiveRoom => ({
  code,
  phase,
  canReturn: true,
})
const found = (r: ActiveRoom): ActiveRoomCheck => ({ status: 'FOUND', room: r })
const NONE: ActiveRoomCheck = { status: 'NONE' }

const answers = (...checks: ActiveRoomCheck[]) =>
  checks.forEach((check) => vi.mocked(checkActiveRoom).mockResolvedValueOnce(check))

beforeEach(() => {
  vi.mocked(sendLeaveFromOutside).mockResolvedValue()
  vi.mocked(leaveWaitingRoom).mockResolvedValue()
  useActiveRoomStore.setState({ room: null, startupChecked: true })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('sair de uma sala sem abrir a tela dela (AMB-01)', () => {
  it('Sala de Espera: sai pelo REST e confere na hora', async () => {
    answers(NONE)
    await expect(leaveActiveRoom(room('WAITING'), { waitMs: 0 })).resolves.toEqual({
      status: 'RELEASED',
    })
    expect(leaveWaitingRoom).toHaveBeenCalledWith('4821')
    expect(sendLeaveFromOutside).not.toHaveBeenCalled()
  })

  it('alguém entrou na Sala de Espera nesse meio-tempo (409): sai pelo STOMP', async () => {
    vi.mocked(leaveWaitingRoom).mockRejectedValueOnce(new ApiError(409, 'x'))
    answers(NONE)
    await leaveActiveRoom(room('WAITING'), { waitMs: 0 })
    expect(sendLeaveFromOutside).toHaveBeenCalledWith('4821')
  })

  it('desistência: a partida vai para o Resultado com o jogador nela, e ele sai de novo', async () => {
    answers(found(room('RESULT')), NONE)
    await expect(leaveActiveRoom(room('PLAYING'), { waitMs: 0 })).resolves.toEqual({
      status: 'RELEASED',
    })
    expect(sendLeaveFromOutside).toHaveBeenCalledTimes(2)
  })

  it('espera o back processar o /leave do STOMP antes de conferir', async () => {
    vi.useFakeTimers()
    answers(NONE)
    const outcome = leaveActiveRoom(room('DRAFT'), { waitMs: 1500 })
    await vi.advanceTimersByTimeAsync(1400)
    expect(checkActiveRoom).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    await expect(outcome).resolves.toEqual({ status: 'RELEASED' })
  })

  it('sai de outra sala que não é a pedida: esta foi liberada', async () => {
    answers(found(room('WAITING', '1234')))
    await expect(leaveActiveRoom(room('RESULT'), { waitMs: 0 })).resolves.toEqual({
      status: 'RELEASED',
    })
  })

  it('a saída falhou ao ser mandada: a conferência decide', async () => {
    vi.mocked(sendLeaveFromOutside).mockRejectedValueOnce(new Error('recusada'))
    answers(NONE)
    await expect(leaveActiveRoom(room('PLAYING'), { waitMs: 0 })).resolves.toEqual({
      status: 'RELEASED',
    })
  })

  it('a saída nem foi mandada e a sala segue igual: para na primeira tentativa', async () => {
    vi.mocked(sendLeaveFromOutside).mockRejectedValue(new Error('tempo esgotado'))
    vi.mocked(checkActiveRoom).mockResolvedValue(found(room('PLAYING')))
    await expect(leaveActiveRoom(room('PLAYING'), { waitMs: 0 })).resolves.toEqual({
      status: 'STILL_THERE',
      room: room('PLAYING'),
    })
    expect(sendLeaveFromOutside).toHaveBeenCalledTimes(1)
  })

  it('sem resposta do back: não dá para saber', async () => {
    answers({ status: 'UNKNOWN' })
    await expect(leaveActiveRoom(room('PLAYING'), { waitMs: 0 })).resolves.toEqual({
      status: 'UNKNOWN',
    })
  })

  it('continua na sala depois de 3 saídas: desiste e devolve a sala como está', async () => {
    vi.mocked(checkActiveRoom).mockResolvedValue(found(room('RESULT')))
    await expect(leaveActiveRoom(room('PLAYING'), { waitMs: 0 })).resolves.toEqual({
      status: 'STILL_THERE',
      room: room('RESULT'),
    })
    expect(sendLeaveFromOutside).toHaveBeenCalledTimes(3)
  })
})

describe('depois de deixar a tela da sala', () => {
  it('ainda na sala (ex: desistiu e ficou no Resultado): sai de novo e tira o aviso', async () => {
    answers(found(room('RESULT')), NONE)
    showActiveRoom(room('RESULT'))
    roomScreenClosed('4821', 0)
    await vi.waitFor(() => expect(useActiveRoomStore.getState().room).toBeNull())
    expect(sendLeaveFromOutside).toHaveBeenCalledWith('4821')
  })

  it('já livre: não manda nada', async () => {
    answers(NONE)
    roomScreenClosed('4821', 0)
    await vi.waitFor(() => expect(checkActiveRoom).toHaveBeenCalled())
    expect(sendLeaveFromOutside).not.toHaveBeenCalled()
    expect(leaveWaitingRoom).not.toHaveBeenCalled()
  })

  it('preso noutra sala: essa fica para o aviso do Hub', async () => {
    answers(found(room('PLAYING', '1234')))
    roomScreenClosed('4821', 0)
    await vi.waitFor(() => expect(checkActiveRoom).toHaveBeenCalled())
    expect(sendLeaveFromOutside).not.toHaveBeenCalled()
  })

  it('voltou para a tela da mesma sala (ex: "Tentar de novo"): nunca é tirado dela', async () => {
    vi.useFakeTimers()
    roomScreenClosed('4821', 1500)
    roomScreenOpened('4821')
    await vi.advanceTimersByTimeAsync(1500)
    expect(checkActiveRoom).not.toHaveBeenCalled()
    expect(sendLeaveFromOutside).not.toHaveBeenCalled()
  })
})
