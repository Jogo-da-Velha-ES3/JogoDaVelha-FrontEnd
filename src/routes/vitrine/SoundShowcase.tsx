import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { ABILITIES } from '../../constants/game'
import { SettingsModal } from '../../features/settings/SettingsModal'
import {
  playLoopSound,
  playMusic,
  playSound,
  soundDuration,
  stopAllMusic,
  stopLoopSound,
  stopSound,
} from '../../features/sound/soundManager'
import { abilitySoundKey, type SoundKey } from '../../features/sound/soundMap'
import { useSettingsStore } from '../../stores/settingsStore'
import { ShowcaseBlock } from './ShowcaseLayout'

// Aba Sons da vitrine (FE-38): todos os sons do jogo para ouvir e comparar, sem jogar uma partida.
// Chama o motor de som direto, sem as stores: na vitrine todas as abas ficam montadas, e um evento
// nas stores faria a partida contra o robô reagir junto.

type Track = 'trilha-hub' | 'trilha-sala' | 'trilha-arena' | 'trilha-morte-subita'
type Loop = 'coracao' | 'tique-taque'

const TRACKS: { key: Track; label: string }[] = [
  { key: 'trilha-hub', label: 'Trilha do Hub' },
  { key: 'trilha-sala', label: 'Trilha da Sala' },
  { key: 'trilha-arena', label: 'Trilha da Arena' },
  { key: 'trilha-morte-subita', label: 'Trilha da Morte Súbita' },
]

const LOOPS: { key: Loop; label: string }[] = [
  { key: 'coracao', label: 'Coração (loop)' },
  { key: 'tique-taque', label: 'Tique-taque (loop)' },
]

const ABILITY_SOUNDS = ABILITIES.map((ability) => ({
  key: abilitySoundKey(ability),
  label: ABILITY_INFO[ability].name,
}))

const EFFECT_GROUPS: { title: string; sounds: { key: SoundKey; label: string }[] }[] = [
  {
    title: 'Efeitos',
    sounds: [
      { key: 'botao', label: 'Botão' },
      { key: 'jogada', label: 'Jogada' },
      { key: 'estouro-tempo', label: 'Estouro de tempo' },
      { key: 'fim-round', label: 'Fim do round' },
      { key: 'coins', label: 'Coins' },
    ],
  },
  { title: 'Habilidades', sounds: ABILITY_SOUNDS },
  {
    title: 'Morte Súbita e Resultado',
    sounds: [
      { key: 'morte-subita', label: 'Sirene da Morte Súbita' },
      { key: 'vitoria', label: 'Vitória' },
      { key: 'derrota', label: 'Derrota' },
      { key: 'empate', label: 'Empate' },
    ],
  },
]

// ---- Partida encurtada ------------------------------------------------------------------------

interface FlowStep {
  label: string
  play: () => void
  /** Efeito: espera ele tocar inteiro (pela duração do arquivo) antes do próximo passo */
  sound?: SoundKey
  /** Trilhas e loops: quanto tempo deixar tocando */
  holdMs?: number
}

/** Pausa entre um som e o próximo */
const GAP_MS = 300
/** Se o arquivo ainda não carregou (duração 0), espera isto */
const FALLBACK_MS = 1500

const effect = (key: SoundKey, label: string): FlowStep => ({
  label,
  play: () => playSound(key),
  sound: key,
})
const music = (key: Track, label: string, holdMs: number): FlowStep => ({
  label,
  play: () => playMusic(key),
  holdMs,
})

function stopLoops() {
  stopLoopSound('tique-taque')
  stopLoopSound('coracao')
}

/** A ordem de uma partida: cada trilha um pouco e cada efeito inteiro (~1 min) */
const SHORT_MATCH: { stage: string; steps: FlowStep[] }[] = [
  {
    stage: 'Hub',
    steps: [music('trilha-hub', 'Trilha do Hub', 5000), effect('botao', 'Botão')],
  },
  {
    stage: 'Sala de Espera e Preparação',
    steps: [music('trilha-sala', 'Trilha da Sala', 5000)],
  },
  {
    stage: 'Arena',
    steps: [
      music('trilha-arena', 'Trilha da Arena', 2500),
      effect('jogada', 'Jogada'),
      ...ABILITY_SOUNDS.map(({ key, label }) => effect(key, label)),
      effect('estouro-tempo', 'Estouro de tempo'),
      effect('fim-round', 'Fim do round'),
    ],
  },
  {
    stage: 'Morte Súbita',
    steps: [
      effect('morte-subita', 'Sirene'),
      {
        label: 'Trilha da Morte Súbita e coração',
        play: () => {
          playMusic('trilha-morte-subita')
          playLoopSound('coracao')
        },
        holdMs: 4000,
      },
      {
        label: 'Tique-taque (3 últimos segundos)',
        play: () => playLoopSound('tique-taque'),
        holdMs: 3000,
      },
    ],
  },
  {
    stage: 'Resultado',
    steps: [
      {
        label: 'A trilha para',
        play: () => {
          stopLoops()
          stopAllMusic()
        },
        holdMs: 800,
      },
      effect('vitoria', 'Vitória'),
      effect('coins', 'Coins'),
      effect('derrota', 'Derrota'),
      effect('empate', 'Empate'),
    ],
  },
]

const STEPS = SHORT_MATCH.flatMap((group) => group.steps)

/** Cada etapa com o seu número na sequência inteira, para a lista saber qual está tocando */
const STAGES = SHORT_MATCH.map((group, g) => {
  const first = SHORT_MATCH.slice(0, g).reduce(
    (total, previous) => total + previous.steps.length,
    0,
  )
  return { ...group, steps: group.steps.map((step, s) => ({ step, index: first + s })) }
})

/** Quanto esperar antes do próximo passo */
function waitFor(step: FlowStep): number {
  if (step.holdMs !== undefined) return step.holdMs
  const seconds = step.sound ? soundDuration(step.sound) : 0
  return (seconds > 0 ? seconds * 1000 : FALLBACK_MS) + GAP_MS
}

/** Para tudo que a aba pode ter deixado tocando */
function silence(current: FlowStep | undefined) {
  stopLoops()
  stopAllMusic()
  if (current?.sound) stopSound(current.sound)
}

export function SoundShowcase() {
  /** Passo da partida encurtada tocando agora; null = parada */
  const [current, setCurrent] = useState<number | null>(null)
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null)
  const [playingLoops, setPlayingLoops] = useState<Loop[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const running = current !== null

  // Cada passo toca e agenda o próximo; o último devolve a aba para "parada"
  useEffect(() => {
    if (current === null) return
    const step = STEPS[current]
    step.play()
    const id = setTimeout(
      () => setCurrent((index) => (index !== null && index + 1 < STEPS.length ? index + 1 : null)),
      waitFor(step),
    )
    return () => clearTimeout(id)
  }, [current])

  // Saiu da vitrine no meio: nada fica tocando
  const currentRef = useRef(current)
  useEffect(() => {
    currentRef.current = current
  }, [current])
  useEffect(
    () => () => {
      if (currentRef.current !== null) silence(STEPS[currentRef.current])
    },
    [],
  )

  function start() {
    silence(undefined)
    setPlayingTrack(null)
    setPlayingLoops([])
    setCurrent(0)
  }

  function stop() {
    silence(current === null ? undefined : STEPS[current])
    setCurrent(null)
  }

  function toggleTrack(key: Track) {
    if (playingTrack === key) {
      stopAllMusic()
      setPlayingTrack(null)
    } else {
      playMusic(key)
      setPlayingTrack(key)
    }
  }

  function toggleLoop(key: Loop) {
    if (playingLoops.includes(key)) {
      stopLoopSound(key)
      setPlayingLoops((loops) => loops.filter((loop) => loop !== key))
    } else {
      playLoopSound(key)
      setPlayingLoops((loops) => [...loops, key])
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)}>
          Volume e mudo (Configurações)
        </Button>
        <span className="text-xs text-text-muted">
          A aba usa o volume e o mudo das Configurações, como o jogo.
        </span>
      </div>
      <MutedNotice />

      <ShowcaseBlock
        title="Partida encurtada"
        hint="Toca, na ordem de uma partida, todas as trilhas e todos os efeitos, cada efeito inteiro (cerca de 1 minuto). O passo tocando fica em destaque."
      >
        <div className="flex gap-2">
          <Button size="sm" data-sound="off" disabled={running} onClick={start}>
            Tocar a partida encurtada
          </Button>
          <Button size="sm" variant="secondary" data-sound="off" disabled={!running} onClick={stop}>
            Parar
          </Button>
        </div>
        <ol className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((group) => (
            <li key={group.stage} className="flex flex-col gap-1">
              <b className="font-display text-sm tracking-wide uppercase">{group.stage}</b>
              <ol className="flex flex-col gap-0.5 text-sm">
                {group.steps.map(({ step, index }) => {
                  const state =
                    current === index ? 'now' : current !== null && index < current ? 'done' : ''
                  return (
                    <li
                      key={step.label}
                      aria-current={state === 'now' ? 'step' : undefined}
                      className={
                        state === 'now'
                          ? 'font-bold text-primary'
                          : state === 'done'
                            ? 'text-text-muted'
                            : ''
                      }
                    >
                      {state === 'now' && <span aria-hidden>▸ </span>}
                      {step.label}
                    </li>
                  )
                })}
              </ol>
            </li>
          ))}
        </ol>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Todos os sons"
        hint="Toque para ouvir um som sozinho. As trilhas tocam até você tocar de novo, uma por vez, como no jogo; os loops também. Durante a partida encurtada, estes botões ficam travados."
      >
        <SoundGroup title="Trilhas">
          {TRACKS.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={playingTrack === key ? 'primary' : 'secondary'}
              aria-pressed={playingTrack === key}
              data-sound="off"
              disabled={running}
              onClick={() => toggleTrack(key)}
            >
              {label}
            </Button>
          ))}
          {LOOPS.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={playingLoops.includes(key) ? 'primary' : 'secondary'}
              aria-pressed={playingLoops.includes(key)}
              data-sound="off"
              disabled={running}
              onClick={() => toggleLoop(key)}
            >
              {label}
            </Button>
          ))}
        </SoundGroup>
        {EFFECT_GROUPS.map((group) => (
          <SoundGroup key={group.title} title={group.title}>
            {group.sounds.map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant="ghost"
                data-sound="off"
                disabled={running}
                onClick={() => playSound(key)}
              >
                {label}
              </Button>
            ))}
          </SoundGroup>
        ))}
      </ShowcaseBlock>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

/**
 * Música ou efeitos desligados (ou no volume 0) nas Configurações: os sons tocam mudos. A escolha
 * fica salva no aparelho, então um teste antigo pode ter deixado a música desligada sem ninguém ver.
 */
function MutedNotice() {
  const { musicOn, musicVolume, sfxOn, sfxVolume } = useSettingsStore()
  const silent = [
    (!musicOn || musicVolume === 0) && 'a música (as 4 trilhas)',
    (!sfxOn || sfxVolume === 0) && 'os efeitos (e as habilidades)',
  ].filter(Boolean)
  if (silent.length === 0) return null
  return (
    <p role="status" className="rounded-lg border border-danger/60 px-3 py-2 text-sm text-danger">
      Nas Configurações, {silent.join(' e ')} {silent.length > 1 ? 'estão' : 'está'} sem som: eles
      tocam mudos. Abra "Volume e mudo" para ligar.
    </p>
  )
}

function SoundGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <b className="text-xs tracking-wide text-text-muted uppercase">{title}</b>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
