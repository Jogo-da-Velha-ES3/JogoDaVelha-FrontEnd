/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHARACTER_INFO } from '../constants/characters'
import type { CharacterId } from '../types/game'

// Lido do disco: o Vitest não processa CSS, então `?raw` viria vazio
const css = readFileSync(resolve(import.meta.dirname, '../index.css'), 'utf8')

function token(name: string) {
  return css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase()
}

describe('tokens do Tailwind', () => {
  it.each(Object.keys(CHARACTER_INFO) as CharacterId[])(
    'a cor do personagem %s bate com CHARACTER_INFO',
    (id) => {
      expect(token(`color-char-${id.toLowerCase()}`)).toBe(CHARACTER_INFO[id].color)
    },
  )

  it('tem as cores de sistema do PROJECT_CONTEXT §4', () => {
    expect(token('color-danger')).toBe('#ff2d3d')
    expect(token('color-coin')).toBe('#ffd257')
    expect(token('color-primary')).toBe('#f4f2ff')
  })
})
