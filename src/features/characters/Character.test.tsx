import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CHARACTER_INFO } from '../../constants/characters'
import { CHARACTERS } from '../../constants/game'
import type { CharacterId } from '../../types/game'
import { Character, type CharacterVariant } from './Character'

const VARIANTS: CharacterVariant[] = ['full', 'avatar', 'piece']

const cases = CHARACTERS.flatMap((id) => VARIANTS.map((variant) => [id, variant] as const))

/** Cores de traço usadas no desenho, sem o filamento branco */
function strokeColors(container: HTMLElement) {
  return new Set(
    [...container.querySelectorAll('path[stroke]')]
      .map((p) => p.getAttribute('stroke'))
      .filter((c) => c !== '#fff'),
  )
}

describe('Character', () => {
  it.each(cases)('%s (%s) aparece com o nome do personagem', (id, variant) => {
    render(<Character id={id} variant={variant} />)
    expect(screen.getByRole('img', { name: CHARACTER_INFO[id].name })).toBeInTheDocument()
  })

  it.each(CHARACTERS)('%s usa a cor oficial da paleta no corpo', (id: CharacterId) => {
    const { container } = render(<Character id={id} variant="piece" />)
    expect(strokeColors(container)).toContain(CHARACTER_INFO[id].color)
  })

  it('avatar tem a borda na cor do personagem', () => {
    render(<Character id="CORACAO" variant="avatar" />)
    expect(screen.getByRole('img', { name: 'Coração' })).toHaveStyle({
      borderColor: CHARACTER_INFO.CORACAO.color,
    })
  })

  it('cada instância tem o próprio filtro de brilho', () => {
    const { container } = render(
      <>
        <Character id="X" variant="piece" />
        <Character id="X" variant="piece" />
      </>,
    )
    const ids = [...container.querySelectorAll('filter')].map((f) => f.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    ids.forEach((id) => expect(id).toMatch(/^[a-zA-Z0-9_-]+$/))
    const used = container.querySelector('path[filter]')?.getAttribute('filter')
    expect(used).toBe(`url(#${ids[0]})`)
  })

  it('anima só a versão grande por padrão', () => {
    const { container } = render(
      <>
        <Character id="O" variant="full" />
        <Character id="O" variant="piece" />
        <Character id="O" variant="avatar" />
      </>,
    )
    const svgs = container.querySelectorAll('svg')
    expect(svgs[0]).toHaveClass('chr-animated')
    expect(svgs[1]).not.toHaveClass('chr-animated')
    expect(svgs[2]).not.toHaveClass('chr-animated')
  })

  it('enfeites e sombra só aparecem na versão grande', () => {
    const { container: full } = render(<Character id="O" variant="full" />)
    const { container: piece } = render(<Character id="O" variant="piece" />)
    expect(full.querySelector('.chr-spin')).not.toBeNull()
    expect(full.querySelector('ellipse')).not.toBeNull()
    expect(piece.querySelector('.chr-spin')).toBeNull()
    expect(piece.querySelector('ellipse')).toBeNull()
  })

  it('decorativo fica escondido dos leitores de tela', () => {
    const { container } = render(<Character id="ESTRELA" variant="avatar" decorative />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
