import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HowToPlayRichText } from './HowToPlayRichText'

const renderText = (text: string) =>
  render(
    <p>
      <HowToPlayRichText text={text} />
    </p>,
  ).container

describe('HowToPlayRichText', () => {
  it('devolve o texto como está quando não há destaque', () => {
    const container = renderText('A linha pode ser horizontal.')
    expect(container).toHaveTextContent('A linha pode ser horizontal.')
    expect(container.querySelector('strong')).toBeNull()
  })

  it('transforma cada trecho entre ** em negrito, sem mostrar os marcadores', () => {
    const container = renderText('Alinhe **4 peças** no tabuleiro **4×4**.')
    const strong = [...container.querySelectorAll('strong')].map((node) => node.textContent)
    expect(strong).toEqual(['4 peças', '4×4'])
    expect(container).toHaveTextContent('Alinhe 4 peças no tabuleiro 4×4.')
  })

  it('pinta "Morte Súbita" de vermelho dentro e fora do negrito', () => {
    const container = renderText('O round 3 é a **Morte Súbita**; morte subita sem acento também.')
    const danger = [...container.querySelectorAll('.text-danger')].map((node) => node.textContent)
    expect(danger).toEqual(['Morte Súbita', 'morte subita'])
    expect(container.querySelector('strong .text-danger')).toHaveTextContent('Morte Súbita')
  })
})
