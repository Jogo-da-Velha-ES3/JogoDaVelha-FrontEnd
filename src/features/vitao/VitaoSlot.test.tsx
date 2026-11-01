import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialBoardState, useBoardStore } from '../../stores/boardStore'
import { INITIAL_MATCH_STATE, useMatchStore } from '../../stores/matchStore'
import { VitaoSlot } from './VitaoSlot'

const head = () => screen.getByAltText('Vitão').getAttribute('src')

beforeEach(() => {
  useBoardStore.setState(initialBoardState(), true)
  useMatchStore.setState(INITIAL_MATCH_STATE, true)
})

describe('VitaoSlot', () => {
  it('calado, fica com a cara normal', () => {
    render(<VitaoSlot />)
    expect(head()).toContain('vitao-normal')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('na Morte Súbita é o Diabo o tempo todo, mesmo calado', () => {
    useMatchStore.setState({ suddenDeath: true })
    render(<VitaoSlot />)
    expect(head()).toContain('vitao-diabo')
  })
})
