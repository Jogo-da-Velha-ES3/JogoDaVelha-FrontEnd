import { create } from 'zustand'

/** info = neutro; danger = erro/aviso (vermelho); coin = ganho ou gasto de Coins (dourado) */
export type ToastTone = 'info' | 'danger' | 'coin'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
  /** Tempo na tela, em ms */
  duration: number
}

export interface ToastInput {
  message: string
  tone?: ToastTone
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  showToast: (toast: ToastInput) => number
  dismissToast: (id: number) => void
}

export const TOAST_DEFAULT_DURATION = 3500
/** Mais que isso empilha demais no celular deitado; o mais antigo sai */
export const TOAST_MAX_VISIBLE = 3

let nextId = 1

// Estado só de interface: não reflete nada do servidor (ARCHITECTURE §3)
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  showToast: ({ message, tone = 'info', duration = TOAST_DEFAULT_DURATION }) => {
    const id = nextId++
    set((state) => ({
      toasts: [...state.toasts, { id, message, tone, duration }].slice(-TOAST_MAX_VISIBLE),
    }))
    return id
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/** Atalho para fora de componentes (ex: tratamento de erro da API) */
export const showToast = (toast: ToastInput) => useToastStore.getState().showToast(toast)
