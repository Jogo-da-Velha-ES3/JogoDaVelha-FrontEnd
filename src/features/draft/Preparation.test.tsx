import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PREPARATION_AUTO_ADVANCE_MS,
  STARTER_ABILITIES,
  STARTER_CHARACTERS,
} from '../../constants/game'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import type { ClientCommand, ServerEvent } from '../../types/events'
import type { CharacterId, PlayerSlot, PlayerState } from '../../types/game'
import { Preparation, type PreparationProps } from './Preparation'

const client = vi.hoisted(() => ({ sendCommand: vi.fn<(command: ClientCommand) => void>() }))
vi.mock('../../sockets/gameClient', () => client)

function send<T extends ServerEvent['type']>(
  type: T,
  payload: Extract<ServerEvent, { type: T }>['payload'],
) {
  act(() => applyServerEvent({ type, payload, serverTime: Date.now() } as never))
}

const player = (slot: PlayerSlot): PlayerState => ({
  slot,
  userId: `u-${slot}`,
  nickname: slot === 'P1' ? 'Rafa' : 'Vini',
  character: null,
  roundsWon: 0,
  consecutiveTimeouts: 0,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
})

const draftUpdate = (
  characters: Partial<Record<PlayerSlot, CharacterId>>,
  ready = { P1: false, P2: false },
) => send('DRAFT_UPDATE', { deadline: Date.now() + 20_000, characters, ready })

/** Preparação de Rafa (P1) contra Vini; por padrão, com só os iniciais desbloqueados */
function renderPreparation(
  props: PreparationProps = {
    unlockedCharacters: STARTER_CHARACTERS,
    unlockedAbilities: STARTER_ABILITIES,
  },
) {
  send('ROOM_SNAPSHOT', {
    code: '4821',
    phase: 'DRAFT',
    players: [player('P1'), player('P2')],
    mySlot: 'P1',
    round: 0,
    suddenDeath: false,
    board: [],
    turn: null,
    myDeck: [],
    outcome: null,
    serverTime: Date.now(),
  })
  draftUpdate({})
  render(<Preparation {...props} />)
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })

beforeEach(() => {
  resetGameStores()
  client.sendCommand.mockClear()
})

describe('Preparação (FE-09)', () => {
  it('personagem: só manda a intenção e o destaque vem do servidor', () => {
    renderPreparation()
    fireEvent.click(button('X'))
    expect(client.sendCommand).toHaveBeenCalledWith({
      type: 'DRAFT_CHARACTER',
      payload: { character: 'X' },
    })
    expect(button('X')).toHaveAttribute('aria-pressed', 'false') // nada otimista

    draftUpdate({ P1: 'X' })
    expect(button('X · selecionado')).toHaveAttribute('aria-pressed', 'true')
  })

  it('personagem reservado pelo oponente ou não comprado não pode ser escolhido [RN-DRAFT-01]', () => {
    renderPreparation()
    draftUpdate({ P2: 'O' })
    expect(button('Reservado por Vini')).toBeDisabled()
    expect(button('Bloqueado · Estrela')).toBeDisabled()

    // Não comprado e reservado: mostra o nome de quem reservou, não o preço [RF-DRAFT-02]
    draftUpdate({ P2: 'ESTRELA' })
    expect(button('Reservado por Vini')).toHaveTextContent('Reservado por Vini')
    expect(screen.queryByRole('button', { name: 'Bloqueado · Estrela' })).not.toBeInTheDocument()
    // Cadeado em SVG, sem emoji (FE-46)
    expect(button('Reservado por Vini')).not.toHaveTextContent('🔒')
    expect(button('Reservado por Vini').querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('só as habilidades desbloqueadas e exatamente 2 para confirmar', () => {
    renderPreparation()
    draftUpdate({ P1: 'X' })
    fireEvent.click(button('Continuar para habilidades'))

    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /^Tornado\./ })).not.toBeInTheDocument()

    const confirm = button('Confirmar habilidades')
    fireEvent.click(button(/^Bomba\./))
    expect(confirm).toBeDisabled()
    fireEvent.click(button(/^Escudo\./))
    fireEvent.click(button(/^Ampulheta\./)) // a 3ª não entra
    expect(button(/^Ampulheta\./)).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(confirm)
    expect(client.sendCommand).toHaveBeenLastCalledWith({
      type: 'DRAFT_ABILITIES',
      payload: { abilities: ['BOMBA', 'ESCUDO'] },
    })
  })

  it('só trava em "Aguardando oponente…" quando o servidor confirma', () => {
    renderPreparation()
    draftUpdate({ P1: 'X' })
    fireEvent.click(button('Continuar para habilidades'))
    fireEvent.click(button(/^Bomba\./))
    fireEvent.click(button(/^Escudo\./))
    fireEvent.click(button('Confirmar habilidades'))

    // Sem resposta (ou com erro), dá para mudar a escolha e mandar de novo
    expect(button('Confirmar habilidades')).toBeEnabled()
    expect(button(/^Bomba\./)).toBeEnabled()

    draftUpdate({ P1: 'X' }, { P1: true, P2: false })
    expect(button('Aguardando oponente…')).toBeDisabled()
    expect(button(/^Bomba\./)).toBeDisabled()
  })

  it('sem inventário (até a FE-30), tudo vem desbloqueado para testes', () => {
    renderPreparation({})
    expect(button('Estrela')).toBeEnabled()
    draftUpdate({ P1: 'X' })
    fireEvent.click(button('Continuar para habilidades'))
    expect(screen.getByRole('button', { name: /^Tornado\./ })).toBeEnabled()
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(10)
  })

  it('mostra o status do oponente em tempo real', () => {
    renderPreparation()
    expect(screen.getByRole('status')).toHaveTextContent('Oponente escolhendo.')
    draftUpdate({ P2: 'O' }, { P1: false, P2: true })
    expect(screen.getByRole('status')).toHaveTextContent('Oponente pronto.')
  })
})

describe('Preparação: guiar o jogador pelas 2 etapas', () => {
  const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms))
  const heading = (name: string) => screen.queryByRole('heading', { name })

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('o servidor confirma o personagem e a tela segue sozinha para as habilidades', () => {
    renderPreparation()
    expect(heading('Escolha seu personagem')).toBeInTheDocument()

    draftUpdate({ P1: 'X' })
    tick(PREPARATION_AUTO_ADVANCE_MS)
    expect(heading('Habilidades iniciais')).toBeInTheDocument()

    // Dá para voltar e trocar
    fireEvent.click(button('1 · Personagem ✓'))
    expect(heading('Escolha seu personagem')).toBeInTheDocument()
  })

  it('o seu status diz o que falta', () => {
    renderPreparation()
    expect(screen.getByText('Falta: personagem')).toBeInTheDocument()

    draftUpdate({ P1: 'X' })
    tick(PREPARATION_AUTO_ADVANCE_MS)
    expect(screen.getByText('Falta: habilidades (0/2)')).toBeInTheDocument()
    fireEvent.click(button(/^Bomba\./))
    expect(screen.getByText('Falta: habilidades (1/2)')).toBeInTheDocument()

    draftUpdate({ P1: 'X' }, { P1: true, P2: false })
    expect(screen.getAllByText('Pronto').length).toBeGreaterThan(0)
  })

  it('nos 8s finais avisa o que falta e leva às habilidades', () => {
    renderPreparation()
    draftUpdate({ P1: 'X' })
    tick(PREPARATION_AUTO_ADVANCE_MS)
    fireEvent.click(button('1 · Personagem ✓')) // voltou e ficou parado na etapa 1
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    tick(12_500) // faltam ~7s dos 20s
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Faltam \ds! Escolha suas 2 habilidades, senão o jogo escolhe por você\./,
    )
    expect(heading('Habilidades iniciais')).toBeInTheDocument()
  })

  it('sem personagem, o aviso pede o personagem', () => {
    renderPreparation()
    tick(12_500)
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha seu personagem')
    expect(heading('Escolha seu personagem')).toBeInTheDocument()
  })
})
