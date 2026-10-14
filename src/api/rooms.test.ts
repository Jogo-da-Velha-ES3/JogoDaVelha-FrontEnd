import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import { createRoom, joinRoomByCode, roomErrorMessage } from './rooms'

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
    [409, { code: 'MATCH_ALREADY_STARTED' }, 'A partida da sala 4821 já começou.'],
  ])('erro %i %o vira "%s" [RN-SAL-01]', async (status, body, message) => {
    respond(status, body)
    await expect(joinRoomByCode('4821')).rejects.toMatchObject({ status, message })
  })
})

describe('roomErrorMessage', () => {
  it('erro desconhecido mantém a mensagem do back', () => {
    expect(roomErrorMessage(new ApiError(500, 'Falha no servidor'), '4821')).toBe(
      'Falha no servidor',
    )
  })
})
