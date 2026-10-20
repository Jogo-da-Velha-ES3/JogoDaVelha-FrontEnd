import { Howl, Howler } from 'howler'
import { MUSIC_KEYS, SOUND_FILES, type SoundKey } from './soundMap'

const sounds = new Map<SoundKey, Howl>()
let unlockListening = false
let musicWanted = false
let musicSuspended = false

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

/** Carrega todos os sons. Arquivo que faltar ou falhar: só não toca, o jogo segue */
export function loadSounds() {
  for (const key of Object.keys(SOUND_FILES) as SoundKey[]) {
    try {
      const howl: Howl = new Howl({
        src: [SOUND_FILES[key]],
        loop: isMusic(key),
        preload: true,
        onloaderror: () => sounds.delete(key),
        // Se o navegador recusar (ex: iPhone antes do toque), a música tenta de novo ao liberar
        onplayerror: () => {
          if (isMusic(key)) {
            howl.once('unlock', () => {
              if (!musicSuspended) howl.play()
            })
          }
        },
      })
      applySettings(key, howl)
      sounds.set(key, howl)
    } catch {
      // som indisponível: ignora
    }
  }
}

function resumeContext() {
  try {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  } catch {
    // sem áudio disponível: ignora
  }
}

/** Começa a trilha em loop (se já estiver tocando ou estiver suspensa, não faz nada) */
export function startMusic() {
  musicWanted = true
  if (musicSuspended) return
  try {
    const music = sounds.get('trilha')
    if (music && !music.playing()) music.play()
  } catch {
    // nunca derruba o jogo por causa de som
  }
}

/**
 * Suspende a trilha (ex: durante a partida) ou a retoma de onde parou.
 * Chamada pela regra de fases em index.ts
 */
export function setMusicSuspended(suspended: boolean) {
  musicSuspended = suspended
  try {
    const music = sounds.get('trilha')
    if (!music) return
    if (suspended) music.pause()
    else if (musicWanted && !music.playing()) music.play()
  } catch {
    // idem
  }
}

/** Pausa a música ao sair da aba/app e volta ao retornar */
function handleVisibility() {
  try {
    const music = sounds.get('trilha')
    if (document.hidden) {
      music?.pause()
    } else {
      resumeContext()
      if (musicWanted && !musicSuspended && music && !music.playing()) music.play()
    }
  } catch {
    // idem
  }
}

/**
 * Libera o áudio no primeiro toque (navegadores, principalmente o iPhone, bloqueiam som
 * automático) e, nesse momento, começa a trilha
 */
export function setupAudioUnlock() {
  if (unlockListening) return
  unlockListening = true
  document.addEventListener('visibilitychange', handleVisibility)

  const events = ['pointerdown', 'touchend', 'keydown'] as const
  const unlock = () => {
    resumeContext()
    startMusic()
    for (const e of events) window.removeEventListener(e, unlock)
  }
  for (const e of events) window.addEventListener(e, unlock)
}

export function playSound(key: SoundKey) {
  try {
    sounds.get(key)?.play()
  } catch {
    // idem
  }
}

export function stopSound(key: SoundKey) {
  try {
    sounds.get(key)?.stop()
  } catch {
    // idem
  }
}

function refreshAll() {
  sounds.forEach((howl, key) => applySettings(key, howl))
}

/** Controles de volume e mudo, separados para efeitos e música (usados nas Configurações, FE-39) */
export const soundSettings = {
  get: () => ({ ...settings }),
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
