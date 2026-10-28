import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ABILITY_INFO } from '../../constants/abilities'
import { sendCommand } from '../../sockets/gameClient'
import { usePowersStore } from '../../stores/powersStore'
import { applyServerEvent, resetGameStores } from '../../stores/serverEvents'
import type { AbilityId, DeckSlot } from '../../types/game'
import { DeckHud } from './DeckHud'

vi.mock('../../sockets/gameClient', () => ({ sendCommand: vi.fn<typeof sendCommand>() }))

const deck = (used: AbilityId[] = []): DeckSlot[] => [
  { ability: 'AMPULHETA', source: 'INITIAL', usedThisRound: used.includes('AMPULHETA') },
  { ability: 'CAMPO_DE_FORCA', source: 'INITIAL', usedThisRound: used.includes('CAMPO_DE_FORCA') },
  { ability: 'BOMBA', source: 'DRAWN', usedThisRound: used.includes('BOMBA') },
]

type Props = Partial<ComponentProps<typeof DeckHud>>

/** A mira vem da store, como na Arena */
function Hud(props: Props) {
  const aim = usePowersStore((s) => s.aim)
  return <DeckHud deck={deck()} canUse silenced={false} aim={aim} turnKey={1} {...props} />
}

function renderHud(props: Props = {}) {
  const view = render(<Hud {...props} />)
  return { ...view, rerender: (next: Props) => view.rerender(<Hud {...next} />) }
}

const card = (name: RegExp) => screen.getByRole('button', { name })

/** Toca numa habilidade sem alvo e confirma no modal */
const useWithoutTarget = (name: RegExp) => {
  fireEvent.click(card(name))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar uso' }))
}

beforeEach(() => {
  resetGameStores()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('DeckHud (FE-11)', () => {
  it('disponível: as 3 cartas com nome, tipo e selo da sorteada, sem a descrição na tela', () => {
    renderHud()
    const deckRegion = screen.getByRole('region', { name: 'Seu deck' })
    expect(within(deckRegion).getAllByRole('button')).toHaveLength(3)
    expect(card(/^Ampulheta, ofensiva$/)).toBeEnabled()
    expect(card(/^Bomba, ofensiva, sorteada$/)).toBeEnabled()
    expect(screen.getAllByText('Sorteada')).toHaveLength(1)

    // A descrição fica só para o leitor de tela (aparece na Preparação e no sorteio)
    const bomba = card(/^Bomba/)
    expect(bomba).toHaveAccessibleDescription(ABILITY_INFO.BOMBA.description)
    expect(screen.getByText(ABILITY_INFO.BOMBA.description)).toHaveClass('sr-only')
  })

  it('vez do oponente: as cartas aparecem, mas não aceitam toque', () => {
    renderHud({ canUse: false })
    for (const name of [/^Ampulheta/, /^Campo de Força/, /^Bomba/])
      expect(card(name)).toBeDisabled()
    expect(screen.queryByText('Usada')).not.toBeInTheDocument()
  })

  it('usada no round: apagada, com "Usada", e as outras continuam livres', () => {
    renderHud({ deck: deck(['BOMBA']) })
    expect(card(/^Bomba, ofensiva, sorteada, usada$/)).toBeDisabled()
    expect(screen.getByText('Usada')).toBeInTheDocument()
    expect(card(/^Ampulheta/)).toBeEnabled()
  })

  it('silenciada: todas bloqueadas, e o aviso só aparece na minha vez', () => {
    const { rerender } = renderHud({ silenced: true })
    expect(card(/^Ampulheta, ofensiva, silenciada$/)).toBeDisabled()
    expect(card(/^Bomba/)).toBeDisabled()
    expect(screen.getAllByText('Silenciada')).toHaveLength(3)
    expect(screen.getByText('Silenciado: sem habilidades neste turno.')).toBeInTheDocument()

    rerender({ silenced: true, canUse: false })
    expect(screen.queryByText('Silenciado: sem habilidades neste turno.')).not.toBeInTheDocument()
  })

  it('selecionada: habilidade com alvo só abre a mira, sem enviar nada; tocar de novo cancela', () => {
    renderHud()
    fireEvent.click(card(/^Bomba/))
    expect(usePowersStore.getState().aim).toEqual({ ability: 'BOMBA', selectedCell: null })
    expect(card(/^Bomba/)).toHaveAttribute('aria-pressed', 'true')
    expect(sendCommand).not.toHaveBeenCalled()

    fireEvent.click(card(/^Bomba/))
    expect(usePowersStore.getState().aim).toBeNull()

    fireEvent.click(card(/^Bomba/))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar mira' }))
    expect(usePowersStore.getState().aim).toBeNull()
  })

  it('sem alvo: confirma, envia só a intenção e espera o servidor sem marcar a carta', () => {
    renderHud()
    fireEvent.click(card(/^Ampulheta/))
    expect(screen.getByRole('dialog', { name: 'Usar Ampulheta?' })).toHaveTextContent(
      ABILITY_INFO.AMPULHETA.description,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar uso' }))

    expect(sendCommand).toHaveBeenCalledOnce()
    expect(sendCommand).toHaveBeenCalledWith({
      type: 'USE_ABILITY',
      payload: { ability: 'AMPULHETA' },
    })
    expect(screen.getByText('Enviando…')).toBeInTheDocument()
    expect(screen.getByText('Aguardando confirmação do servidor…')).toBeInTheDocument()
    expect(card(/^Ampulheta, ofensiva$/)).toBeDisabled() // ainda não "usada"
    expect(card(/^Campo de Força/)).toBeDisabled()
  })

  it('depois de um uso confirmado, outra habilidade sem alvo pode ser usada num turno seguinte', () => {
    const { rerender } = renderHud()
    useWithoutTarget(/^Ampulheta/)

    // O servidor confirma e passa a vez; depois volta a minha vez no mesmo round
    rerender({ deck: deck(['AMPULHETA']), canUse: false, turnKey: 2 })
    rerender({ deck: deck(['AMPULHETA']), turnKey: 3 })
    expect(screen.queryByText('Aguardando confirmação do servidor…')).not.toBeInTheDocument()

    fireEvent.click(card(/^Campo de Força/))
    expect(screen.getByRole('button', { name: 'Confirmar uso' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar uso' }))
    expect(sendCommand).toHaveBeenLastCalledWith({
      type: 'USE_ABILITY',
      payload: { ability: 'CAMPO_DE_FORCA' },
    })
  })

  it('no round seguinte, a mesma habilidade volta livre (o envio antigo não fica pendente)', () => {
    const { rerender } = renderHud()
    useWithoutTarget(/^Ampulheta/)
    rerender({ deck: deck(['AMPULHETA']), canUse: false, turnKey: 2 })

    // Novo round: o deck chega sem nenhuma carta usada
    rerender({ deck: deck(), turnKey: 5 })
    expect(card(/^Ampulheta/)).toBeEnabled()
    expect(screen.queryByText('Enviando…')).not.toBeInTheDocument()
  })

  it('um erro do servidor destrava as cartas para tentar de novo', () => {
    renderHud()
    useWithoutTarget(/^Ampulheta/)
    expect(card(/^Campo de Força/)).toBeDisabled()

    act(() =>
      applyServerEvent({
        type: 'ERROR',
        payload: { code: 'NOT_YOUR_TURN', message: 'Não é a sua vez.' },
        serverTime: Date.now(),
      }),
    )
    expect(card(/^Campo de Força/)).toBeEnabled()
    expect(card(/^Ampulheta/)).toBeEnabled()
  })

  it('o modal aberto num turno não volta sozinho no turno seguinte', async () => {
    const { rerender } = renderHud()
    fireEvent.click(card(/^Ampulheta/))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    rerender({ canUse: false, turnKey: 2 })
    rerender({ turnKey: 3 })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('deck incompleto: nada é clicável até o servidor mandar as 3 cartas', () => {
    renderHud({ deck: deck().slice(0, 2) })
    expect(card(/^Ampulheta/)).toBeDisabled()
    expect(screen.getByText('Aguardando o deck do servidor…')).toBeInTheDocument()
  })
})
