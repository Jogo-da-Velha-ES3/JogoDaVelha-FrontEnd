import { beforeEach, describe, expect, it, vi } from 'vitest'

// Howler imitado: cada Howl criado fica guardado, com o arquivo e se está tocando
const { created, FakeHowl } = vi.hoisted(() => {
  class FakeHowl {
    src: string
    isPlaying = false
    /** O que o motor pediu para fazer quando o fade terminar */
    afterFade: (() => void) | null = null
    constructor(options: { src: string[] }) {
      this.src = options.src[0]
      created.push(this)
    }
    play() {
      this.isPlaying = true
    }
    stop() {
      this.isPlaying = false
    }
    pause() {
      this.isPlaying = false
    }
    playing() {
      return this.isPlaying
    }
    volume() {
      return 1
    }
    mute() {}
    loop() {}
    fade() {}
    once(event: string, listener: () => void) {
      if (event === 'fade') this.afterFade = listener
    }
  }
  const created: FakeHowl[] = []
  return { created, FakeHowl }
})

vi.mock('howler', () => ({ Howl: FakeHowl, Howler: { ctx: null } }))

const tracks = () => created.filter((howl) => howl.src.includes('trilha-'))
const track = (name: string) => created.find((howl) => howl.src.includes(name))
/** A trilha anterior terminou de abaixar: o motor para ela e começa a próxima */
const finishFade = (name: string) => track(name)?.afterFade?.()

beforeEach(() => {
  created.length = 0
  vi.resetModules()
})

describe('motor de som: trilhas (FE-38)', () => {
  it('ao abrir o app, carrega os efeitos e nenhuma trilha', async () => {
    const { loadSounds } = await import('./soundManager')
    loadSounds()

    expect(created.length).toBeGreaterThan(0)
    expect(tracks()).toHaveLength(0)
  })

  it('a trilha é criada na primeira vez que toca, e só ela', async () => {
    const { loadSounds, playMusic } = await import('./soundManager')
    loadSounds()

    playMusic('trilha-hub')

    expect(tracks()).toHaveLength(1)
    expect(track('trilha-hub')?.isPlaying).toBe(true)
  })

  it('uma trilha por vez: a anterior abaixa e para antes de a próxima começar', async () => {
    const { playMusic } = await import('./soundManager')
    playMusic('trilha-sala')

    playMusic('trilha-arena')
    expect(track('trilha-arena')?.isPlaying).toBe(false) // esperando o fade da Sala

    finishFade('trilha-sala')
    expect(track('trilha-sala')?.isPlaying).toBe(false)
    expect(track('trilha-arena')?.isPlaying).toBe(true)
  })

  it('pedir a mesma trilha de novo não cria outra nem recomeça', async () => {
    const { playMusic } = await import('./soundManager')
    playMusic('trilha-arena')
    playMusic('trilha-arena')

    expect(tracks()).toHaveLength(1)
    expect(track('trilha-arena')?.isPlaying).toBe(true)
  })

  it('stopAllMusic para a trilha (Resultado) e a próxima tela volta a tocar', async () => {
    const { playMusic, stopAllMusic } = await import('./soundManager')
    playMusic('trilha-morte-subita')

    stopAllMusic()
    finishFade('trilha-morte-subita')
    expect(track('trilha-morte-subita')?.isPlaying).toBe(false)

    playMusic('trilha-hub')
    expect(track('trilha-hub')?.isPlaying).toBe(true)
  })
})
