import { useMediaQuery } from './useMediaQuery'

/**
 * Tela em pé num aparelho de toque. `pointer: coarse` evita pedir para "girar"
 * uma janela estreita de desktop. [RNF-ARQ-03]
 */
export const ROTATE_DEVICE_QUERY = '(orientation: portrait) and (pointer: coarse)'

/** true quando é preciso mostrar o aviso "Gire o celular" */
export function useShouldRotateDevice(): boolean {
  return useMediaQuery(ROTATE_DEVICE_QUERY)
}
