import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ROTATE_DEVICE_QUERY } from '../../hooks/useShouldRotateDevice'
import { mockMatchMedia } from '../../test/matchMedia'
import { RotateDeviceModal } from './RotateDeviceModal'

describe('RotateDeviceModal', () => {
  it('só considera tela em pé em aparelho de toque', () => {
    const { matchMedia } = mockMatchMedia(false)
    render(<RotateDeviceModal />)
    expect(matchMedia).toHaveBeenCalledWith(ROTATE_DEVICE_QUERY)
    expect(ROTATE_DEVICE_QUERY).toBe('(orientation: portrait) and (pointer: coarse)')
  })

  it('não aparece em paisagem nem no desktop', () => {
    mockMatchMedia(false)
    render(<RotateDeviceModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('aparece em retrato, não fecha com Esc e some ao deitar o celular', async () => {
    const media = mockMatchMedia(true)
    render(<RotateDeviceModal />)

    const dialog = screen.getByRole('dialog', { name: 'Gire o celular' })
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()

    fireEvent(dialog, createEvent('cancel', dialog, { cancelable: true }))
    expect(dialog).toBeInTheDocument()

    act(() => media.set(false))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    act(() => media.set(true))
    expect(screen.getByRole('dialog', { name: 'Gire o celular' })).toBeInTheDocument()
  })
})
