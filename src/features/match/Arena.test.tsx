import { act, fireEvent, render, screen } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ABILITY_IMPACT_SECONDS,
  ABILITY_NOTICE_SECONDS,
  ROUND_BANNER_SECONDS,
  ROUND_COIN_FLIP_SECONDS,
  SUDDEN_DEATH_ENTRY_SECONDS,
} from '../../constants/game'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import { useTimerStore } from '../../stores/timerStore'
import type { ServerEvent } from '../../types/events'
import type { PlayerSlot, PlayerState, RoomSnapshot } from '../../types/game'
import { Arena } from './Arena'
import { sendCommand } from '../../sockets/gameClient'
import { usePowersStore } from '../../stores/powersStore'

vi.mock('../../sockets/gameClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../sockets/gameClient')>()
  return { ...actual, sendCommand: vi.fn<typeof actual.sendCommand>() }
})

function send<T extends ServerEvent['type']>(
  type: T,
  payload: Extract<ServerEvent, { type: T }>['payload'],
) {
  act(() => applyServerEvent({ type, payload, serverTime: Date.now() } as never))
}

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

const player = (slot: PlayerSlot): PlayerState => ({
  slot,
  userId: `u-${slot}`,
  nickname: slot === 'P1' ? 'Rafa' : 'Vini',
  character: slot === 'P1' ? 'X' : 'O',
  roundsWon: 0,
  consecutiveTimeouts: 0,
  forceFieldTurnsLeft: 0,
  silenced: false,
  connected: true,
})

/** Arena de Rafa (P1) contra Vini, já em jogo */
function renderArena(onQuit = vi.fn<() => void>()) {
  const snapshot: RoomSnapshot = {
    code: '4821',
    phase: 'PLAYING',
    players: [player('P1'), player('P2')],
    mySlot: 'P1',
    round: 1,
    suddenDeath: false,
    board: Array.from({ length: 16 }, (_, index) => ({ index, owner: null, effects: [] })),
    turn: { player: 'P1', startedAt: Date.now(), durationSeconds: 10 },
    myDeck: [],
    outcome: null,
    serverTime: Date.now(),
  }
  send('ROOM_SNAPSHOT', snapshot)
  const router = createMemoryRouter([{ path: '/', element: <Arena onQuit={onQuit} /> }])
  render(<RouterProvider router={router} />)
  return onQuit
}

const startRound = (round: number, startingPlayer: PlayerSlot) => {
  send('ROUND_START', { round, startingPlayer, suddenDeath: round === 3 })
  send('PHASE_CHANGE', { phase: 'ROUND_DRAW' })
}

/** Fim do sorteio: começa a apresentação do round (banner ou entrada da Morte Súbita) */
const endDraw = () => send('PHASE_CHANGE', { phase: 'PLAYING' })

// As animações do Framer contam tempo real, que os fake timers não adiantam: sem elas, os avisos
// entram e saem na hora certa do relógio do teste
beforeAll(() => {
  MotionGlobalConfig.instantAnimations = true
})

afterAll(() => {
  MotionGlobalConfig.instantAnimations = false
})

beforeEach(() => {
  vi.useFakeTimers()
  resetGameStores()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('aviso de turno perdido (TURN_TIMEOUT)', () => {
  it('vermelho para quem estourou, com os textos da tabela, e some sozinho', async () => {
    renderArena()
    send('TURN_TIMEOUT', { player: 'P1', consecutiveTimeouts: 1 })
    expect(screen.getByText('Tempo Esgotado!')).toBeInTheDocument()
    expect(screen.getByText('Você perdeu a vez · 1/3')).toBeInTheDocument()

    send('TURN_TIMEOUT', { player: 'P1', consecutiveTimeouts: 2 })
    expect(screen.getByText('2/3 · Mais um e é W.O.!')).toBeInTheDocument()

    await tick(4000)
    expect(screen.queryByText('Tempo Esgotado!')).not.toBeInTheDocument()
  })

  it('estouro do oponente e nada quando só o timer do front chega a 0', async () => {
    renderArena()
    await tick(11_000) // o turno de 10s "acabou" no front, mas o servidor não mandou nada
    expect(screen.queryByText('Tempo Esgotado!')).not.toBeInTheDocument()

    send('TURN_TIMEOUT', { player: 'P2', consecutiveTimeouts: 1 })
    const toast = screen.getByText('Oponente perdeu a vez').parentElement!
    expect(toast).toHaveTextContent('1/3')
  })
})

describe('banner de início do round', () => {
  it('round 1: depois do sorteio, a moeda gira, revela quem começa e o banner sai', async () => {
    renderArena()
    startRound(1, 'P2')
    expect(screen.queryByRole('status', { name: 'Round 1' })).not.toBeInTheDocument()

    endDraw()
    expect(screen.getByRole('status', { name: 'Round 1' })).toBeInTheDocument()
    expect(screen.getByText('sorteando quem começa…')).toBeInTheDocument()
    expect(screen.queryByText('Vini começa')).not.toBeInTheDocument()

    await tick(ROUND_COIN_FLIP_SECONDS * 1000)
    expect(screen.getByText('Vini começa')).toBeInTheDocument()

    await tick((ROUND_BANNER_SECONDS - ROUND_COIN_FLIP_SECONDS) * 1000 + 500)
    expect(screen.queryByRole('status', { name: 'Round 1' })).not.toBeInTheDocument()
  })

  it('MATCH POINT de quem tem 1 vitória', () => {
    renderArena()
    send('ROUND_END', { round: 1, winner: 'P2', winningLine: null, score: { P1: 0, P2: 1 } })
    startRound(2, 'P1')
    endDraw()
    expect(screen.getByRole('status', { name: 'Match Point de Vini' })).toBeInTheDocument()
    expect(screen.getByText('Você começa')).toBeInTheDocument()
  })

  it('quem reconecta (snapshot) não vê o banner', () => {
    renderArena()
    expect(screen.queryByRole('status', { name: 'Round 1' })).not.toBeInTheDocument()
  })
})

describe('sorteio da 3ª habilidade (FE-10)', () => {
  it('mostra as três cartas, marca habilidades de experimento e envia só a intenção escolhida', () => {
    renderArena()
    send('DECK_UPDATE', {
      deck: [
        { ability: 'BOMBA', source: 'INITIAL', usedThisRound: false },
        { ability: 'ESCUDO', source: 'INITIAL', usedThisRound: false },
      ],
    })
    send('PHASE_CHANGE', { phase: 'ROUND_DRAW' })
    // O sorteio nunca traz as 2 iniciais; Ampulheta é grátis, então não é "experimente"
    send('DRAW_OPTIONS', {
      options: ['TORNADO', 'AMPULHETA', 'SILENCIO'],
      deadline: Date.now() + 8000,
    })

    expect(screen.getByRole('heading', { name: 'Sorteio da 3ª habilidade' })).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Tempo para escolher a habilidade' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tornado, experimente/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Silêncio, experimente/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^Ampulheta\./ })).toBeEnabled()
    expect(screen.queryByText(/Não é possível descartar/)).not.toBeInTheDocument()
    expect(
      screen.queryByText('A escolha só será confirmada quando o servidor responder.'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Tornado, experimente/i }))

    expect(sendCommand).toHaveBeenCalledWith({ type: 'DRAW_PICK', payload: { ability: 'TORNADO' } })
    expect(usePowersStore.getState().deck.map((slot) => slot.ability)).toEqual(['BOMBA', 'ESCUDO'])
    expect(screen.getByText('Enviando escolha ao servidor…')).toBeInTheDocument()
  })

  it('quando o prazo chega a zero, aguarda o servidor e não escolhe localmente', async () => {
    renderArena()
    send('PHASE_CHANGE', { phase: 'ROUND_DRAW' })
    send('DRAW_OPTIONS', {
      options: ['TORNADO', 'ESCUDO', 'SILENCIO'],
      deadline: Date.now() + 8000,
    })

    await tick(8100)

    expect(
      screen.getByText('Tempo esgotado. Aguardando a escolha automática do servidor…'),
    ).toBeInTheDocument()
    expect(sendCommand).not.toHaveBeenCalled()
    expect(usePowersStore.getState().deck).toEqual([])
  })

  it('depois da confirmação, mostra a carta escolhida e espera o oponente', () => {
    renderArena()
    send('PHASE_CHANGE', { phase: 'ROUND_DRAW' })
    send('DRAW_OPTIONS', {
      options: ['TORNADO', 'AMPULHETA', 'SILENCIO'],
      deadline: Date.now() + 8000,
    })
    fireEvent.click(screen.getByRole('button', { name: /Tornado, experimente/i }))

    // O servidor confirma: a carta entra no deck e as opções saem
    send('DECK_UPDATE', {
      deck: [
        { ability: 'BOMBA', source: 'INITIAL', usedThisRound: false },
        { ability: 'ESCUDO', source: 'INITIAL', usedThisRound: false },
        { ability: 'TORNADO', source: 'DRAWN', usedThisRound: false },
      ],
    })

    const region = screen.getByRole('region', { name: 'Sorteio da terceira habilidade' })
    expect(region).toHaveTextContent('Tornado')
    expect(screen.getByText('Aguardando o oponente…')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando as cartas do servidor…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tornado, ofensiva, sorteada/i })).toBeInTheDocument()
  })

  it('se a escolha volta com erro, as cartas destravam para tentar de novo', () => {
    renderArena()
    send('PHASE_CHANGE', { phase: 'ROUND_DRAW' })
    send('DRAW_OPTIONS', {
      options: ['TORNADO', 'AMPULHETA', 'SILENCIO'],
      deadline: Date.now() + 8000,
    })
    fireEvent.click(screen.getByRole('button', { name: /Tornado, experimente/i }))
    expect(screen.getByRole('button', { name: /Silêncio, experimente/i })).toBeDisabled()

    send('ERROR', { code: 'NOT_CONNECTED', message: 'Sem conexão com o servidor.' })

    expect(screen.getByRole('button', { name: /Silêncio, experimente/i })).toBeEnabled()
    expect(screen.queryByText('Enviando escolha ao servidor…')).not.toBeInTheDocument()
  })

  it('as cartas vêm antes do banner de início do round, e a pausa abre por cima delas', () => {
    renderArena()
    startRound(1, 'P1')
    send('DRAW_OPTIONS', {
      options: ['TORNADO', 'AMPULHETA', 'SILENCIO'],
      deadline: Date.now() + 8000,
    })

    const drawRegion = () =>
      screen.queryByRole('region', { name: 'Sorteio da terceira habilidade' })
    const region = drawRegion()!
    expect(region).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Round 1' })).not.toBeInTheDocument()

    const z = (el: HTMLElement) => Number(/z-\[(\d+)\]/.exec(el.className)?.[1])
    const pause = screen.getByRole('button', { name: 'Pausa' })
    expect(z(pause)).toBeGreaterThan(z(region))
    fireEvent.click(pause)
    expect(screen.getByRole('dialog', { name: 'Menu de pausa' })).toBeInTheDocument()

    endDraw()
    expect(drawRegion()).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Round 1' })).toBeInTheDocument()
  })

  it('no round 3, a entrada da Morte Súbita só vem depois das cartas', () => {
    renderArena()
    startRound(3, 'P1')
    send('DRAW_OPTIONS', {
      options: ['TORNADO', 'AMPULHETA', 'SILENCIO'],
      deadline: Date.now() + 8000,
    })
    expect(
      screen.getByRole('region', { name: 'Sorteio da terceira habilidade' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('5 segundos por jogada')).not.toBeInTheDocument()

    endDraw()
    expect(screen.getByText('5 segundos por jogada')).toBeInTheDocument()
  })
})

describe('mira e efeitos das habilidades (FE-27)', () => {
  const deck = () =>
    send('DECK_UPDATE', {
      deck: [
        { ability: 'BOMBA', source: 'INITIAL', usedThisRound: false },
        { ability: 'TORNADO', source: 'INITIAL', usedThisRound: false },
        { ability: 'ESCUDO', source: 'DRAWN', usedThisRound: false },
      ],
    })

  /** Tabuleiro com peças do oponente (Vini, O) nas casas indicadas */
  const opponentAt = (...indexes: number[]) =>
    send('BOARD_UPDATE', {
      board: Array.from({ length: 16 }, (_, index) => ({
        index,
        owner: indexes.includes(index) ? ('P2' as const) : null,
        effects: [],
      })),
    })

  const resolved = (
    patch: Partial<Extract<ServerEvent, { type: 'ABILITY_RESOLVED' }>['payload']>,
  ) =>
    send('ABILITY_RESOLVED', {
      by: 'P2',
      ability: 'BOMBA',
      targetCell: 5,
      destinationCell: null,
      absorbed: false,
      noEffect: false,
      ...patch,
    })

  const turnOf = (slot: PlayerSlot) =>
    send('TURN_START', {
      player: slot,
      startedAt: Date.now(),
      durationSeconds: 10,
      consecutiveTimeouts: { P1: 0, P2: 0 },
    })

  const impact = () => document.querySelector('[data-layer="ability-impact"]')

  it('Bomba: só a peça do oponente é alvo; depois do envio, nada é clicável até o servidor', () => {
    renderArena()
    deck()
    opponentAt(5)

    fireEvent.click(screen.getByRole('button', { name: /^Bomba,/ }))
    expect(screen.getByText('Bomba: escolha uma peça do oponente')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /alvo possível/ })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /Linha 2, coluna 2: O/ }))
    expect(sendCommand).toHaveBeenCalledWith({
      type: 'USE_ABILITY',
      payload: { ability: 'BOMBA', targetCell: 5 },
    })
    // Esperando o servidor: o alvo não aceita outro toque e a mira não pode ser cancelada
    expect(screen.queryByRole('button', { name: /Linha 2, coluna 2/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar mira' })).not.toBeInTheDocument()
    expect(screen.getByText('Enviando…')).toBeInTheDocument()

    resolved({ by: 'P1' })
    expect(usePowersStore.getState().aim).toBeNull()
    expect(impact()).not.toBeNull()
    expect(sendCommand).toHaveBeenCalledTimes(1)
  })

  it('um erro do servidor destrava a mira para escolher outro alvo', () => {
    renderArena()
    deck()
    opponentAt(5, 6)

    fireEvent.click(screen.getByRole('button', { name: /^Bomba,/ }))
    fireEvent.click(screen.getByRole('button', { name: /Linha 2, coluna 2: O/ }))
    send('ERROR', { code: 'INVALID_TARGET', message: 'Escolha uma peça do oponente.' })

    fireEvent.click(screen.getByRole('button', { name: /Linha 2, coluna 3: O/ }))
    expect(sendCommand).toHaveBeenLastCalledWith({
      type: 'USE_ABILITY',
      payload: { ability: 'BOMBA', targetCell: 6 },
    })
  })

  it('Tornado: primeiro a peça, depois a casa vizinha de destino', () => {
    renderArena()
    deck()
    opponentAt(1)

    fireEvent.click(screen.getByRole('button', { name: /^Tornado,/ }))
    fireEvent.click(screen.getByRole('button', { name: /Linha 1, coluna 2: O/ }))
    expect(screen.getByText('Tornado: agora escolha a casa de destino')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Linha 1, coluna 3: vazia, alvo possível' }))
    expect(sendCommand).toHaveBeenCalledWith({
      type: 'USE_ABILITY',
      payload: { ability: 'TORNADO', targetCell: 1, destinationCell: 2 },
    })
  })

  it('Esc cancela a mira e volta para "Sua vez"', () => {
    renderArena()
    deck()
    opponentAt(1)

    fireEvent.click(screen.getByRole('button', { name: /^Bomba,/ }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(usePowersStore.getState().aim).toBeNull()
    expect(screen.getByText('Toque numa casa ou use uma habilidade')).toBeInTheDocument()
  })

  it('carta sem nenhum alvo fica desabilitada, com "Sem alvo"', () => {
    renderArena()
    deck() // tabuleiro vazio: Bomba e Tornado não têm peça do oponente para mirar

    expect(screen.getByRole('button', { name: /^Bomba, ofensiva, sem alvo/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Escudo,/ })).toBeEnabled()

    opponentAt(5)
    expect(screen.getByRole('button', { name: /^Bomba,/ })).toBeEnabled()
  })

  it('habilidade do oponente: efeito na casa por 1s e aviso por 2,5s, sem voltar depois', async () => {
    renderArena()
    opponentAt(5)

    resolved({})
    expect(screen.getByText('Oponente usou Bomba')).toBeInTheDocument()
    expect(impact()).not.toBeNull()

    await tick(ABILITY_IMPACT_SECONDS * 1000)
    expect(impact()).toBeNull()
    expect(screen.getByText('Oponente usou Bomba')).toBeInTheDocument()

    await tick((ABILITY_NOTICE_SECONDS - ABILITY_IMPACT_SECONDS) * 1000)
    expect(screen.queryByText('Oponente usou Bomba')).not.toBeInTheDocument()

    opponentAt(5)
    expect(impact()).toBeNull()
  })

  it('anulada pelo Campo de Força ou sem efeito: avisa também quando a habilidade é minha', () => {
    renderArena()

    resolved({ by: 'P1', absorbed: true })
    expect(screen.getByText('Anulada pelo Campo de Força!')).toBeInTheDocument()
    expect(screen.getByText('Você usou Bomba')).toBeInTheDocument()

    resolved({ ability: 'TORNADO', noEffect: true })
    expect(screen.getByText('Sem efeito!')).toBeInTheDocument()
    expect(screen.getByText('Oponente usou Tornado')).toBeInTheDocument()
  })

  it('habilidade minha com efeito não tem aviso, só o efeito na casa', () => {
    renderArena()
    resolved({ by: 'P1' })
    expect(impact()).not.toBeNull()
    expect(screen.queryByText(/usou Bomba/)).not.toBeInTheDocument()
  })

  it('Silêncio do oponente: efeito no centro e minhas habilidades travadas só no meu turno', () => {
    renderArena()
    deck()
    opponentAt(5)

    resolved({ ability: 'SILENCIO', targetCell: null })
    expect(document.querySelector('[data-layer="ability-impact-global"]')).not.toBeNull()

    turnOf('P1')
    expect(screen.getByText('Silenciado: sem habilidades neste turno.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Bomba,/ })).toBeDisabled()

    turnOf('P2')
    expect(screen.queryByText('Silenciado: sem habilidades neste turno.')).not.toBeInTheDocument()
  })
})

describe('Morte Súbita e empate absoluto (FE-13)', () => {
  it('entrada da Morte Súbita só nos primeiros segundos do round 3', async () => {
    renderArena()
    startRound(3, 'P1')
    endDraw()
    expect(screen.getByText('5 segundos por jogada')).toBeInTheDocument()

    await tick(SUDDEN_DEATH_ENTRY_SECONDS * 1000 + 500)
    expect(screen.queryByText('5 segundos por jogada')).not.toBeInTheDocument()
  })

  it('round 3 empatado já anuncia o empate absoluto [RN-ARN-06]', () => {
    renderArena()
    startRound(3, 'P1')
    send('ROUND_END', { round: 3, winner: null, winningLine: null, score: { P1: 1, P2: 1 } })
    send('PHASE_CHANGE', { phase: 'ROUND_END' })
    expect(screen.getByText('Empate absoluto')).toBeInTheDocument()
    expect(screen.getByText('Ninguém venceu a Morte Súbita')).toBeInTheDocument()
    expect(screen.queryByText('Round empatado')).not.toBeInTheDocument()
  })

  it('round 1 ou 2 empatado continua como "Round empatado"', () => {
    renderArena()
    send('ROUND_END', { round: 1, winner: null, winningLine: null, score: { P1: 0, P2: 0 } })
    send('PHASE_CHANGE', { phase: 'ROUND_END' })
    expect(screen.getByText('Round empatado')).toBeInTheDocument()
  })

  it('regra de 18/10: round 3 empatado com 1×0 não é empate absoluto (quem está na frente vence)', () => {
    renderArena()
    startRound(3, 'P1')
    send('ROUND_END', { round: 3, winner: null, winningLine: null, score: { P1: 1, P2: 0 } })
    send('PHASE_CHANGE', { phase: 'ROUND_END' })
    expect(screen.getByText('Round empatado')).toBeInTheDocument()
    expect(screen.queryByText('Empate absoluto')).not.toBeInTheDocument()
  })

  it('regra de 18/10: quem está atrás vence o round 3 e empata em 1×1 = empate absoluto', () => {
    renderArena()
    startRound(3, 'P1')
    send('ROUND_END', { round: 3, winner: 'P2', winningLine: null, score: { P1: 1, P2: 1 } })
    send('PHASE_CHANGE', { phase: 'ROUND_END' })
    expect(screen.getByText('Empate absoluto')).toBeInTheDocument()
    expect(screen.getByText('Placar final 1 × 1')).toBeInTheDocument()
    expect(screen.queryByText('Round do oponente')).not.toBeInTheDocument()
  })

  it('MATCH_END de empate absoluto mostra os Coins que vieram do servidor', () => {
    renderArena()
    startRound(3, 'P1')
    send('ROUND_END', { round: 3, winner: null, winningLine: null, score: { P1: 1, P2: 1 } })
    send('MATCH_END', { outcome: { kind: 'ABSOLUTE_DRAW' }, coins: { P1: 20, P2: 20 } })
    send('PHASE_CHANGE', { phase: 'RESULT' })
    // Um banner só: o do fim do round 3 continua e só troca o subtítulo para os Coins
    expect(screen.getAllByText('Empate absoluto')).toHaveLength(1)
    expect(screen.getByText('+20 Coins para cada')).toBeInTheDocument()
    expect(screen.queryByText('Ninguém venceu a Morte Súbita')).not.toBeInTheDocument()
  })
})

describe('oponente desconectado', () => {
  it('aviso fora do tabuleiro com os estouros dele, e some quando ele volta', () => {
    renderArena()
    send('PLAYER_DISCONNECTED', { slot: 'P2' })
    send('TURN_TIMEOUT', { player: 'P2', consecutiveTimeouts: 1 })
    const notice = screen.getByText('Oponente desconectado').parentElement!
    expect(notice).toHaveTextContent('Os turnos dele continuam correndo · 1/3')
    // O tabuleiro continua jogável para quem ficou
    expect(screen.getAllByRole('button', { name: /vazia/ }).length).toBeGreaterThan(0)

    send('PLAYER_RECONNECTED', { slot: 'P2' })
    expect(screen.queryByText('Oponente desconectado')).not.toBeInTheDocument()
  })
})

describe('deck na Arena (FE-11)', () => {
  it('com a mira aberta, tocar numa casa vazia não vira jogada', () => {
    renderArena()
    send('DECK_UPDATE', {
      deck: [
        { ability: 'BOMBA', source: 'INITIAL', usedThisRound: false },
        { ability: 'ESCUDO', source: 'INITIAL', usedThisRound: false },
        { ability: 'TORNADO', source: 'DRAWN', usedThisRound: false },
      ],
    })
    // Uma peça do oponente, para a Bomba ter alvo
    send('BOARD_UPDATE', {
      board: Array.from({ length: 16 }, (_, index) => ({
        index,
        owner: index === 15 ? ('P2' as const) : null,
        effects: [],
      })),
    })
    expect(screen.getAllByRole('button', { name: /vazia/ }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /^Bomba/ }))
    expect(screen.queryAllByRole('button', { name: /vazia/ })).toHaveLength(0)
    expect(sendCommand).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar mira' }))
    fireEvent.click(screen.getAllByRole('button', { name: /vazia/ })[0])
    expect(sendCommand).toHaveBeenCalledWith({ type: 'MOVE', payload: { cell: 0 } })
  })
})

describe('menu de pausa', () => {
  it('não para o timer e "Desistir" sai da partida', () => {
    const onQuit = renderArena()
    const turnBefore = useTimerStore.getState().turn

    fireEvent.click(screen.getByRole('button', { name: 'Pausa' }))
    expect(screen.getByRole('dialog', { name: 'Menu de pausa' })).toBeInTheDocument()
    expect(useTimerStore.getState().turn).toBe(turnBefore) // nada foi mandado ao servidor
    expect(screen.getByRole('button', { name: 'Configurações · em breve' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Desistir' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Desistir' }).at(-1)!)
    expect(onQuit).toHaveBeenCalledOnce()
  })
})
