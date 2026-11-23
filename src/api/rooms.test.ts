import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import {
  ActiveRoomError,
  checkActiveRoom,
  createRoom,
  enterRoomByLink,
  joinRoomByCode,
  leaveWaitingRoom,
  roomErrorMessage,
  withRoomConflictCheck,
} from './rooms'

const fetchMock = vi.fn<typeof fetch>()

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  fetchMock.mockReset()
})

describe('modo simulado (padrão)', () => {
  it('criar sala sorteia um código de 4 dígitos sem chamar o back', async () => {
    const { code } = await createRoom()
    expect(code).toMatch(/^\d{4}$/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('entrar sempre funciona', async () => {
    await expect(joinRoomByCode('4821')).resolves.toEqual({ code: '4821' })
  })

  it('entrar pelo link não chama o back', async () => {
    await expect(enterRoomByLink('4821')).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('o jogador nunca fica preso numa sala: nenhuma sala ativa, sem chamar o back', async () => {
    await expect(checkActiveRoom()).resolves.toEqual({ status: 'NONE' })
    await expect(leaveWaitingRoom('4821')).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('back de verdade', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_SERVER', 'false')
  })

  it('criar sala devolve o código do back', async () => {
    respond(201, { id: 'x', code: '4821', status: 'WAITING' })
    await expect(createRoom()).resolves.toEqual({ code: '4821' })
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/rooms$/)
  })

  it.each([
    [404, undefined, 'Sala 4821 não encontrada.'],
    [409, undefined, 'A sala 4821 está cheia ou a partida já começou.'],
    [409, { code: 'ROOM_FULL', message: '…' }, 'A sala 4821 já está cheia.'],
    [409, { code: 'ROOM_ALREADY_STARTED' }, 'A partida da sala 4821 já começou.'],
    [
      400,
      { code: 'ROOM_BAD_REQUEST', message: 'Sala não encontrada' },
      'Sala 4821 não encontrada.',
    ],
    // O back só manda ROOM_CONFLICT no /join quando o jogador ainda está numa sala (AMB-01)
    [
      409,
      { code: 'ROOM_CONFLICT', message: '…' },
      'Você ainda está em uma sala. Tente de novo em instantes.',
    ],
  ])('erro %i %o vira "%s" [RN-SAL-01]', async (status, body, message) => {
    respond(status, body)
    await expect(joinRoomByCode('4821')).rejects.toMatchObject({ status, message })
  })

  const conflict = () =>
    respond(409, { code: 'ROOM_CONFLICT', message: 'Jogador já está em uma sala ativa' })
  const activeRoom = (code: string, phase = 'PLAYING') =>
    respond(200, { code, phase, canReturn: true })

  describe('entrar pelo link', () => {
    it('faz o POST /join antes da sala abrir', async () => {
      respond(200, { id: 'x', code: '4821', status: 'IN_GAME' })
      await expect(enterRoomByLink('4821')).resolves.toBeUndefined()
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/rooms\/4821\/join$/)
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' })
    })

    it('quem já está nesta sala (host, recarregar a página) segue para o STOMP', async () => {
      conflict()
      activeRoom('4821')
      await expect(enterRoomByLink('4821')).resolves.toBeUndefined()
      expect(fetchMock.mock.calls[1][0]).toMatch(/\/rooms\/active$/)
    })

    it('quem ainda está noutra sala recebe a sala dela (AMB-01)', async () => {
      conflict()
      activeRoom('1234', 'DRAFT')
      const error = await enterRoomByLink('4821').catch((e: unknown) => e)
      expect(error).toBeInstanceOf(ActiveRoomError)
      expect(error).toMatchObject({
        message: 'Você ainda está na sala 1234.',
        room: { code: '1234', phase: 'DRAFT', canReturn: true },
      })
    })

    it('sala recém-liberada (204): tenta o /join de novo', async () => {
      conflict()
      respond(204)
      respond(200, { id: 'x', code: '4821', status: 'IN_GAME' })
      await expect(enterRoomByLink('4821')).resolves.toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(fetchMock.mock.calls[2][0]).toMatch(/\/rooms\/4821\/join$/)
    })

    it('sem saber em que sala está, segue para o STOMP, como antes', async () => {
      conflict()
      respond(500, { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' })
      await expect(enterRoomByLink('4821')).resolves.toBeUndefined()
    })

    it.each([
      [404, 'ROOM_NOT_FOUND', 'Sala 4821 não encontrada.'],
      [409, 'ROOM_FULL', 'A sala 4821 já está cheia.'],
      [409, 'ROOM_ALREADY_STARTED', 'A partida da sala 4821 já começou.'],
    ])('erro %i %s vira "%s"', async (status, code, message) => {
      respond(status, { code, message: '…' })
      await expect(enterRoomByLink('4821')).rejects.toMatchObject({ status, code, message })
    })
  })

  describe('sala em que o jogador ainda está (GET /rooms/active, AMB-01)', () => {
    it('200: a sala, com código, fase e se dá para voltar', async () => {
      respond(200, { code: '0042', phase: 'DRAFT', canReturn: true })
      await expect(checkActiveRoom()).resolves.toEqual({
        status: 'FOUND',
        room: { code: '0042', phase: 'DRAFT', canReturn: true },
      })
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/rooms\/active$/)
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' })
    })

    it('204: nenhuma sala', async () => {
      respond(204)
      await expect(checkActiveRoom()).resolves.toEqual({ status: 'NONE' })
    })

    it('fase que o front não conhece: a sala vem com a fase em branco', async () => {
      respond(200, { code: '0042', phase: 'VERSUS', canReturn: true })
      await expect(checkActiveRoom()).resolves.toMatchObject({ room: { phase: null } })
    })

    it.each([
      ['erro do servidor', () => respond(500, { code: 'INTERNAL_ERROR' })],
      ['rede', () => fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))],
      ['corpo sem código', () => respond(200, { phase: 'DRAFT', canReturn: true })],
      ['código que não é de 4 dígitos', () => respond(200, { code: '42', canReturn: true })],
      ['corpo sem canReturn', () => respond(200, { code: '0042', phase: 'DRAFT' })],
      ['corpo que não é JSON', () => fetchMock.mockResolvedValueOnce(new Response('<html>'))],
    ])('%s: não dá para saber, sem lançar erro', async (_, arrange) => {
      arrange()
      await expect(checkActiveRoom()).resolves.toEqual({ status: 'UNKNOWN' })
    })
  })

  describe('criar ou entrar quando o back diz que o jogador ainda está numa sala', () => {
    const create = () => withRoomConflictCheck(createRoom)

    it('outra sala: lança o ActiveRoomError com ela', async () => {
      conflict()
      activeRoom('1234', 'WAITING')
      await expect(create()).rejects.toMatchObject({
        name: 'ActiveRoomError',
        room: { code: '1234', phase: 'WAITING' },
      })
    })

    it('nenhuma sala (acabou de ser liberada): tenta de novo uma vez', async () => {
      conflict()
      respond(204)
      respond(201, { id: 'x', code: '9999', status: 'WAITING' })
      await expect(create()).resolves.toEqual({ code: '9999' })
    })

    it('liberada e recusada de novo: "Você ainda está em uma sala"', async () => {
      conflict()
      respond(204)
      conflict()
      await expect(create()).rejects.toMatchObject({
        status: 409,
        code: 'ROOM_CONFLICT',
        message: 'Você ainda está em uma sala. Tente de novo em instantes.',
      })
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('sem saber em que sala: "Você ainda está em uma sala", sem tentar de novo', async () => {
      conflict()
      respond(503)
      await expect(create()).rejects.toMatchObject({ code: 'ROOM_CONFLICT' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('outros erros passam direto, sem perguntar ao back', async () => {
      respond(500, { code: 'INTERNAL_ERROR' })
      await expect(create()).rejects.toMatchObject({ status: 500 })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('sair da Sala de Espera pelo REST', () => {
    it('faz o POST /leave', async () => {
      respond(204)
      await expect(leaveWaitingRoom('4821')).resolves.toBeUndefined()
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/rooms\/4821\/leave$/)
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' })
    })

    it('sala que já não existe conta como saída feita', async () => {
      respond(404, { code: 'ROOM_NOT_FOUND' })
      await expect(leaveWaitingRoom('4821')).resolves.toBeUndefined()
    })

    it('partida já começou (409): o erro sobe, a saída é pelo STOMP', async () => {
      respond(409, { code: 'ROOM_ALREADY_STARTED' })
      await expect(leaveWaitingRoom('4821')).rejects.toMatchObject({ status: 409 })
    })
  })
})

describe('roomErrorMessage', () => {
  it('erro desconhecido mantém a mensagem do back', () => {
    expect(roomErrorMessage(new ApiError(500, 'Falha no servidor'), '4821')).toBe(
      'Falha no servidor',
    )
  })
})
