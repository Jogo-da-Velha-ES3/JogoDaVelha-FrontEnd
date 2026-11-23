import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActiveRoom } from '../../lib/activeRoom'
import { showActiveRoom, useActiveRoomStore } from '../../stores/activeRoomStore'
import { useToastStore } from '../../stores/toastStore'
import { ActiveRoomModal } from './ActiveRoomModal'

vi.mock('../lobby/roomRelease', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lobby/roomRelease')>()
  return { ...original, leaveActiveRoom: vi.fn<typeof original.leaveActiveRoom>() }
})

import { leaveActiveRoom } from '../lobby/roomRelease'

const room = (phase: ActiveRoom['phase'], canReturn = true): ActiveRoom => ({
  code: '4821',
  phase,
  canReturn,
})

function renderHub(active: ActiveRoom) {
  showActiveRoom(active)
  const router = createMemoryRouter(
    [
      { path: '/', element: <ActiveRoomModal /> },
      { path: '/sala/:codigo', element: <p>sala</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const button = (name: string) => screen.getByRole('button', { name })

afterEach(() => {
  vi.clearAllMocks()
  useActiveRoomStore.setState({ room: null })
  useToastStore.setState({ toasts: [] })
})

describe('aviso de sala em andamento no Hub (AMB-01)', () => {
  it('sem sala, não aparece', () => {
    render(
      <RouterProvider router={createMemoryRouter([{ path: '/', element: <ActiveRoomModal /> }])} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['WAITING', 'Sua sala está aberta', 'Voltar para a sala', 'Fechar a sala'],
    ['MATCHED', 'Você ainda está numa sala', 'Voltar para a sala', 'Sair da sala'],
    ['DRAFT', 'Você ainda está numa sala', 'Voltar para a sala', 'Sair da sala'],
    ['PLAYING', 'Partida em andamento', 'Voltar para a partida', 'Desistir'],
    ['RESULT', 'Partida encerrada', 'Ver o resultado', 'Sair da sala'],
    [null, 'Você ainda está numa sala', 'Voltar para a sala', 'Sair da sala'],
  ] as const)('%s: "%s", com "%s" e "%s"', (phase, title, back, leave) => {
    renderHub(room(phase))
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveTextContent('4821')
    expect(button(back)).toBeEnabled()
    expect(button(leave)).toBeEnabled()
    // Sem fechar por fora: o jogador escolhe voltar ou sair
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()
  })

  it('voltar leva à sala sem refazer o /join, e o aviso some', async () => {
    const router = renderHub(room('PLAYING'))
    await userEvent.click(button('Voltar para a partida'))

    expect(router.state.location.pathname).toBe('/sala/4821')
    expect(router.state.location.state).toEqual({ joined: true })
    expect(useActiveRoomStore.getState().room).toBeNull()
  })

  it('não dá para voltar (canReturn: false): só sair', () => {
    renderHub(room('DRAFT', false))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Não dá mais para voltar à sala 4821. Saia dela para jogar de novo.',
    )
    expect(screen.queryByRole('button', { name: 'Voltar para a sala' })).not.toBeInTheDocument()
    expect(button('Sair da sala')).toBeEnabled()
  })

  it('fechar a Sala de Espera: sai sem confirmação, avisa e o aviso some', async () => {
    vi.mocked(leaveActiveRoom).mockResolvedValueOnce({ status: 'RELEASED' })
    renderHub(room('WAITING'))
    await userEvent.click(button('Fechar a sala'))

    await waitFor(() => expect(useActiveRoomStore.getState().room).toBeNull())
    expect(leaveActiveRoom).toHaveBeenCalledWith(room('WAITING'))
    expect(useToastStore.getState().toasts).toMatchObject([
      { message: 'Você saiu da sala 4821.', tone: 'info' },
    ])
  })

  it('desistir da partida pede a mesma confirmação da pausa', async () => {
    vi.mocked(leaveActiveRoom).mockResolvedValueOnce({ status: 'RELEASED' })
    renderHub(room('PLAYING'))
    await userEvent.click(button('Desistir'))

    expect(screen.getByRole('heading', { name: 'Desistir?' })).toBeInTheDocument()
    expect(leaveActiveRoom).not.toHaveBeenCalled()

    // Continuar volta ao aviso, sem sair
    await userEvent.click(button('Continuar'))
    expect(screen.getByRole('heading', { name: 'Partida em andamento' })).toBeInTheDocument()

    await userEvent.click(button('Desistir'))
    await userEvent.click(button('Desistir'))
    await waitFor(() => expect(useActiveRoomStore.getState().room).toBeNull())
    expect(leaveActiveRoom).toHaveBeenCalledTimes(1)
  })

  it('sair da Preparação confirma que a sala fecha para o oponente', async () => {
    renderHub(room('DRAFT'))
    await userEvent.click(button('Sair da sala'))
    expect(screen.getByRole('heading', { name: 'Sair da sala?' })).toBeInTheDocument()
  })

  it('esperando o servidor, os botões travam com "Saindo…"', async () => {
    vi.mocked(leaveActiveRoom).mockReturnValueOnce(new Promise(() => {}))
    renderHub(room('RESULT'))
    await userEvent.click(button('Sair da sala'))

    expect(button('Saindo…')).toBeDisabled()
    expect(button('Ver o resultado')).toBeDisabled()
  })

  it.each([
    ['sem resposta', { status: 'UNKNOWN' }],
    ['ainda na sala', { status: 'STILL_THERE', room: room('RESULT') }],
  ] as const)('%s: o aviso fica, com o erro e os botões de volta', async (_, outcome) => {
    vi.mocked(leaveActiveRoom).mockResolvedValueOnce(outcome)
    renderHub(room('RESULT'))
    await userEvent.click(button('Sair da sala'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não deu para sair da sala agora. Tente de novo.',
    )
    expect(button('Sair da sala')).toBeEnabled()
    expect(button('Ver o resultado')).toBeEnabled()
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('ainda na sala, noutra fase (a desistência levou ao Resultado): o aviso muda de fase', async () => {
    vi.mocked(leaveActiveRoom).mockResolvedValueOnce({
      status: 'STILL_THERE',
      room: room('RESULT'),
    })
    renderHub(room('PLAYING'))
    await userEvent.click(button('Desistir'))
    await userEvent.click(button('Desistir'))

    expect(await screen.findByRole('heading', { name: 'Partida encerrada' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
