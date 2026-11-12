import { Howl, Howler } from 'howler'
import {
  MUSIC_KEYS,
  SOUND_KEYS,
  type SoundKey,
  soundUrl,
  type VoiceKey,
  voiceUrl,
} from './soundMap'

const sounds = new Map<SoundKey, Howl>()
const loopingEffects = new Set<SoundKey>()
let unlockListening = false
let musicWanted = false
let currentMusicKey: SoundKey | null = null

const MUSIC_FADE_MS = 500

const settings = {
  sfxVolume: 1,
  musicVolume: 0.3,
  sfxMuted: false,
  musicMuted: false,
}

const isMusic = (key: SoundKey) => MUSIC_KEYS.includes(key)

function applySettings(key: SoundKey, howl: Howl) {
  const music = isMusic(key)
  howl.volume(music ? settings.musicVolume : settings.sfxVolume)
  howl.mute(music ? settings.musicMuted : settings.sfxMuted)
}

/** Cria o som de uma chave. Arquivo que faltar ou falhar: só não toca, o jogo segue. */
function createHowl(key: SoundKey): Howl | undefined {
  const src = soundUrl(key)
  if (!src) return undefined

  try {
    const howl: Howl = new Howl({
      src: [src],
      loop: isMusic(key),
      // Trilhas longas tocam por streaming em vez de baixar tudo de uma vez.
      html5: isMusic(key),
      preload: true,
      onloaderror: () => sounds.delete(key),
      // Se o navegador recusar a música, tenta novamente ao liberar o áudio.
      onplayerror: () => {
        if (isMusic(key)) {
          howl.once('unlock', () => {
            if (currentMusicKey === key && musicWanted && !howl.playing()) {
              howl.play()
            }
          })
        }
      },
    })

    applySettings(key, howl)
    sounds.set(key, howl)
    return howl
  } catch {
    // Som indisponível: ignora.
    return undefined
  }
}

/**
 * Carrega os efeitos ao abrir o app. As trilhas não: cada uma é criada na primeira vez que toca
 * (playMusic). Criar todas de uma vez baixava ~9 MB de música só de abrir a tela de entrada.
 */
export function loadSounds() {
  for (const key of SOUND_KEYS) {
    if (!isMusic(key)) createHowl(key)
  }
}

/**
 * Abaixa a trilha até o silêncio e para. Se ela for pedida de novo enquanto abaixa (ex: parar
 * tudo e logo voltar à mesma trilha), não para: volta ao volume e continua de onde estava.
 */
function fadeOut(key: SoundKey, music: Howl, onDone?: () => void) {
  music.fade(music.volume(), 0, MUSIC_FADE_MS)
  music.once('fade', () => {
    if (currentMusicKey === key && musicWanted) {
      applySettings(key, music)
      return
    }
    music.stop()
    onDone?.()
  })
}

function resumeContext() {
  try {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Sem áudio disponível: ignora.
  }
}

/** Toca a trilha escolhida e encerra a anterior. */
export function playMusic(key: SoundKey) {
  if (!isMusic(key)) return

  musicWanted = true

  try {
    const previousKey = currentMusicKey
    const previousMusic = previousKey ? sounds.get(previousKey) : undefined
    const nextMusic = sounds.get(key) ?? createHowl(key)
    if (!nextMusic) {
      // Trilha sem arquivo ou que falhou: a anterior não fica tocando no lugar dela
      if (previousKey && previousMusic?.playing()) fadeOut(previousKey, previousMusic)
      currentMusicKey = key
      return
    }

    if (currentMusicKey === key && nextMusic.playing()) return
    currentMusicKey = key

    const startNext = () => {
      if (currentMusicKey !== key || !musicWanted) return
      if (nextMusic.playing()) {
        // Estava abaixando (pediram de novo durante o fade): volta ao volume sem recomeçar
        nextMusic.fade(nextMusic.volume(), settings.musicVolume, MUSIC_FADE_MS)
        return
      }
      applySettings(key, nextMusic)
      nextMusic.play()
    }

    if (previousKey && previousMusic && previousMusic !== nextMusic && previousMusic.playing()) {
      fadeOut(previousKey, previousMusic, startNext)
    } else {
      startNext()
    }
  } catch {
    // Nunca derruba o jogo por causa de som.
  }
}

/** Para a trilha. No Resultado não tem música: a vinheta é o efeito que toca no MATCH_END. */
export function stopAllMusic() {
  musicWanted = false
  currentMusicKey = null

  for (const key of MUSIC_KEYS) {
    try {
      const music = sounds.get(key)
      if (!music) continue

      if (music.playing()) fadeOut(key, music)
    } catch {
      // Sem áudio disponível: ignora.
    }
  }
}

/** Toca um efeito em loop, mantendo-o na categoria de efeitos sonoros. */
export function playLoopSound(key: SoundKey) {
  if (isMusic(key)) return

  try {
    const sound = sounds.get(key)
    if (!sound) return

    loopingEffects.add(key)
    sound.loop(true)
    if (!sound.playing()) sound.play()
  } catch {
    // Som indisponível: ignora.
  }
}

/** Para um efeito em loop e restaura o comportamento de reprodução única. */
export function stopLoopSound(key: SoundKey) {
  if (isMusic(key)) return

  try {
    const sound = sounds.get(key)
    loopingEffects.delete(key)
    sound?.stop()
    sound?.loop(false)
  } catch {
    // Som indisponível: ignora.
  }
}

/** Pausa a trilha ao sair da aba/app e retoma ao retornar. */
function handleVisibility() {
  try {
    const music = currentMusicKey ? sounds.get(currentMusicKey) : undefined

    if (document.hidden) {
      music?.pause()
    } else {
      resumeContext()
      if (musicWanted && music && !music.playing()) music.play()
    }
  } catch {
    // Sem áudio disponível: ignora.
  }
}

/** Libera o áudio no primeiro toque; a tela atual escolhe a trilha com playMusic(). */
export function setupAudioUnlock() {
  if (unlockListening) return
  unlockListening = true
  document.addEventListener('visibilitychange', handleVisibility)

  const events = ['pointerdown', 'touchend', 'keydown'] as const
  const unlock = () => {
    resumeContext()

    if (currentMusicKey && musicWanted) {
      const music = sounds.get(currentMusicKey)
      if (music && !music.playing()) music.play()
    }

    for (const event of events) window.removeEventListener(event, unlock)
  }

  for (const event of events) window.addEventListener(event, unlock)
}

export function playSound(key: SoundKey) {
  try {
    const sound = sounds.get(key)
    if (!sound) return

    // Efeitos em loop devem continuar em loop se playSound for chamado novamente.
    if (loopingEffects.has(key)) sound.loop(true)
    sound.play()
  } catch {
    // Som indisponível: ignora.
  }
}

export function stopSound(key: SoundKey) {
  try {
    const sound = sounds.get(key)
    sound?.stop()

    if (loopingEffects.has(key)) {
      loopingEffects.delete(key)
      sound?.loop(false)
    }
  } catch {
    // Som indisponível: ignora.
  }
}

/** Duração do som em segundos; 0 se ele não existe ou ainda não carregou (aba Sons da vitrine) */
export function soundDuration(key: SoundKey): number {
  try {
    return sounds.get(key)?.duration() ?? 0
  } catch {
    return 0
  }
}

// ---- Voz do Vitão (FE-48) ----------------------------------------------------------------------
// Canal próprio, com volume da voz e mudo pelo Vitão desligado nas Configurações. Uma voz por vez.

const voices = new Map<VoiceKey, Howl>()
let currentVoice: Howl | null = null
const voiceSettings = { volume: 1, muted: false }

function createVoice(key: VoiceKey): Howl | undefined {
  const src = voiceUrl(key)
  if (!src) return undefined
  try {
    const howl = new Howl({
      src: [src],
      preload: true,
      volume: voiceSettings.volume,
      onloaderror: () => voices.delete(key),
    })
    voices.set(key, howl)
    return howl
  } catch {
    return undefined
  }
}

/**
 * Baixa as falas antes de precisar delas (ao entrar na Arena), para a voz sair junto com o balão.
 * Não carrega nada ao abrir o app, nem com o Vitão desligado.
 */
export function preloadVoices(keys: readonly VoiceKey[]) {
  if (voiceSettings.muted) return
  for (const key of keys) if (!voices.has(key)) createVoice(key)
}

/** Toca uma fala. Uma voz por vez: a nova corta a que estiver tocando (PROJECT_CONTEXT §9) */
export function playVoice(key: VoiceKey) {
  stopVoice()
  if (voiceSettings.muted) return
  try {
    const voice = voices.get(key) ?? createVoice(key)
    if (!voice) return
    voice.volume(voiceSettings.volume)
    currentVoice = voice
    voice.play()
  } catch {
    // Fala indisponível: o Vitão fala só por escrito.
  }
}

/** Duração da fala em segundos; 0 se ela ainda não carregou (aba Sons da vitrine) */
export function voiceDuration(key: VoiceKey): number {
  try {
    return voices.get(key)?.duration() ?? 0
  } catch {
    return 0
  }
}

/** Para a fala que estiver tocando (ex: ao sair da sala) */
export function stopVoice() {
  try {
    currentVoice?.stop()
  } catch {
    // Sem áudio disponível: ignora.
  }
  currentVoice = null
}

function refreshAll() {
  sounds.forEach((howl, key) => applySettings(key, howl))
}

/** Controles de volume e mudo, separados para efeitos, música e a voz do Vitão. */
export const soundSettings = {
  get: () => ({ ...settings, voiceVolume: voiceSettings.volume, voiceMuted: voiceSettings.muted }),
  setVoiceVolume(v: number) {
    voiceSettings.volume = Math.min(1, Math.max(0, v))
    voices.forEach((voice) => voice.volume(voiceSettings.volume))
  },
  /** Vitão desligado: nenhuma voz toca, e a que estiver tocando para na hora */
  setVoiceMuted(muted: boolean) {
    voiceSettings.muted = muted
    if (muted) stopVoice()
  },
  setSfxVolume(v: number) {
    settings.sfxVolume = Math.min(1, Math.max(0, v))
    refreshAll()
  },
  setMusicVolume(v: number) {
    settings.musicVolume = Math.min(1, Math.max(0, v))
    refreshAll()
  },
  setSfxMuted(muted: boolean) {
    settings.sfxMuted = muted
    refreshAll()
  },
  setMusicMuted(muted: boolean) {
    settings.musicMuted = muted
    refreshAll()
  },
}
