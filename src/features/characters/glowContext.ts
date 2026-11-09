import { createContext } from 'react'

/** Id do filtro de brilho do <svg> atual; cada <Character> cria o seu (vários na mesma tela). */
export const GlowContext = createContext<string>('')
