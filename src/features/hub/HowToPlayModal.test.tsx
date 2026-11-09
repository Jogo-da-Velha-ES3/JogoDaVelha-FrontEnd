import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionGlobalConfig } from 'framer-motion'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ABILITY_INFO } from '../../constants/abilities'
import { HowToPlayModal } from './HowToPlayModal'
import { HOW_TO_PLAY_ABILITY_ORDER, HOW_TO_PLAY_PAGES } from './howToPlayTexts'

beforeAll(() => {
  MotionGlobalConfig.instantAnimations = true
})

afterAll(() => {
  MotionGlobalConfig.instantAnimations = false
})

const TOTAL = HOW_TO_PLAY_PAGES.length
const DECK_PAGE = HOW_TO_PLAY_PAGES.findIndex((page) => page.visual === 'deck')

/** Título da página atual (o h3 abaixo do "Como Jogar") */
const pageTitle = () => screen.getByRole('heading', { level: 3 })

async function expectPage(index: number) {
  await waitFor(() => expect(pageTitle()).toHaveTextContent(HOW_TO_PLAY_PAGES[index].title))
  expect(screen.getByText(`Página ${index + 1} de ${TOTAL}`)).toBeInTheDocument()
}

function renderModal(onClose = vi.fn<() => void>()) {
  const view = render(<HowToPlayModal open onClose={onClose} closeLabel="Voltar ao menu" />)
  return { onClose, ...view }
}

const pressOnDocument = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document, { key, ...init })

async function openDeckPage() {
  await userEvent.click(
    screen.getByRole('button', {
      name: `Página ${DECK_PAGE + 1} de ${TOTAL}: ${HOW_TO_PLAY_PAGES[DECK_PAGE].title}`,
    }),
  )
  await expectPage(DECK_PAGE)
}

const abilityName = (index: number) => ABILITY_INFO[HOW_TO_PLAY_ABILITY_ORDER[index]].name

describe('HowToPlayModal', () => {
  it('abre na primeira página, com Anterior desabilitado', async () => {
    renderModal()
    expect(screen.getByRole('dialog', { name: 'Como Jogar' })).toBeInTheDocument()
    await expectPage(0)
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(pageTitle()).toHaveAttribute('aria-live', 'polite')
  })

  it('anda pelas páginas com Próximo e Anterior e fecha pelo botão da última', async () => {
    const { onClose } = renderModal()

    for (let index = 1; index < TOTAL; index++) {
      await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      await expectPage(index)
    }
    expect(screen.queryByRole('button', { name: 'Próximo' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    await expectPage(TOTAL - 2)

    await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao menu' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('vai direto para uma página pelas bolinhas, marcando a atual', async () => {
    renderModal()
    const last = HOW_TO_PLAY_PAGES[TOTAL - 1]
    const dot = screen.getByRole('button', { name: `Página ${TOTAL} de ${TOTAL}: ${last.title}` })

    await userEvent.click(dot)
    await expectPage(TOTAL - 1)
    expect(dot).toHaveAttribute('aria-current', 'step')
  })

  it('muda de página com ← →, sem passar das pontas e ignorando modificadores', async () => {
    renderModal()

    pressOnDocument('ArrowLeft')
    await expectPage(0)

    pressOnDocument('ArrowRight')
    await expectPage(1)

    pressOnDocument('ArrowRight', { shiftKey: true })
    pressOnDocument('ArrowRight', { ctrlKey: true })
    await expectPage(1)

    for (let index = 0; index < TOTAL + 2; index++) pressOnDocument('ArrowRight')
    await expectPage(TOTAL - 1)
    expect(screen.queryByRole('button', { name: 'Próximo' })).not.toBeInTheDocument()
  })

  it('volta para a primeira página ao reabrir', async () => {
    const onClose = vi.fn<() => void>()
    const { rerender } = render(<HowToPlayModal open onClose={onClose} />)
    pressOnDocument('ArrowRight')
    pressOnDocument('ArrowRight')
    await expectPage(2)

    rerender(<HowToPlayModal open={false} onClose={onClose} />)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    rerender(<HowToPlayModal open onClose={onClose} />)
    await expectPage(0)
  })

  it('ignora as setas depois de fechado', async () => {
    const onClose = vi.fn<() => void>()
    const { rerender } = render(<HowToPlayModal open onClose={onClose} />)
    rerender(<HowToPlayModal open={false} onClose={onClose} />)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    pressOnDocument('ArrowRight')
    rerender(<HowToPlayModal open onClose={onClose} />)
    await expectPage(0)
  })
})

describe('HowToPlayModal — carrossel das habilidades', () => {
  it('mostra nome, tipo e descrição de ABILITY_INFO, uma habilidade por vez', async () => {
    renderModal()
    await openDeckPage()

    const first = ABILITY_INFO[HOW_TO_PLAY_ABILITY_ORDER[0]]
    expect(screen.getByText(first.name)).toBeInTheDocument()
    expect(screen.getByText(first.description)).toBeInTheDocument()
    expect(screen.queryByText(abilityName(1))).not.toBeInTheDocument()
  })

  it('anda pelos botões ‹ › e pelos indicadores, sem passar das pontas', async () => {
    renderModal()
    await openDeckPage()

    const previous = screen.getByRole('button', { name: 'Item anterior' })
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(previous)
    expect(screen.getByText(abilityName(0))).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Próximo item' }))
    expect(await screen.findByText(abilityName(1))).toBeInTheDocument()

    const lastIndex = HOW_TO_PLAY_ABILITY_ORDER.length - 1
    const lastDot = screen.getByRole('button', {
      name: `${abilityName(lastIndex)} (${lastIndex + 1} de ${lastIndex + 1})`,
    })
    await userEvent.click(lastDot)
    expect(await screen.findByText(abilityName(lastIndex))).toBeInTheDocument()
    expect(lastDot).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: 'Próximo item' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('com o foco no carrossel, ← → andam pelas habilidades e não mudam de página', async () => {
    renderModal()
    await openDeckPage()
    const next = screen.getByRole('button', { name: 'Próximo item' })

    fireEvent.keyDown(next, { key: 'ArrowRight' })
    expect(await screen.findByText(abilityName(1))).toBeInTheDocument()
    await expectPage(DECK_PAGE)

    fireEvent.keyDown(next, { key: 'ArrowRight', shiftKey: true })
    expect(screen.getByText(abilityName(1))).toBeInTheDocument()
    await expectPage(DECK_PAGE)

    fireEvent.keyDown(next, { key: 'ArrowLeft' })
    expect(await screen.findByText(abilityName(0))).toBeInTheDocument()
    await expectPage(DECK_PAGE)
  })

  it('na primeira habilidade, ← vai para a página anterior com o foco em Anterior', async () => {
    renderModal()
    await openDeckPage()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Item anterior' }), { key: 'ArrowLeft' })
    await expectPage(DECK_PAGE - 1)
    expect(screen.getByRole('button', { name: 'Anterior' })).toHaveFocus()
  })

  it('na última habilidade, → vai para a página seguinte com o foco em Próximo', async () => {
    renderModal()
    await openDeckPage()
    const lastIndex = HOW_TO_PLAY_ABILITY_ORDER.length - 1
    const lastDot = screen.getByRole('button', {
      name: `${abilityName(lastIndex)} (${lastIndex + 1} de ${lastIndex + 1})`,
    })
    await userEvent.click(lastDot)
    expect(await screen.findByText(abilityName(lastIndex))).toBeInTheDocument()

    fireEvent.keyDown(lastDot, { key: 'ArrowRight' })
    await expectPage(DECK_PAGE + 1)
    expect(screen.getByRole('button', { name: 'Próximo' })).toHaveFocus()
  })
})
