import { motion, useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import { ROUNDS_TO_WIN_MATCH } from '../../constants/game'
import { otherSlot } from '../../lib/match'
import { classifyResult, type ResultKind } from '../../lib/result'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import type { CharacterId } from '../../types/game'
import { Character } from '../characters'
import { celebrationFlavor } from './celebration'
import { CoinsReward } from './CoinsReward'
import { CelebrationBurst, CelebrationHalo } from './ResultCelebration'
import { RematchPanel } from './RematchPanel'
import { RESULT_TITLES, resultSubtitle } from './resultTexts'
import { useLiveResult } from './useLiveResult'

export interface ResultScreenProps {
  /** "Voltar ao Lobby". Padrão do RematchPanel: sai da sala e vai para o Hub */
  onLeave?: () => void
}

type Tone = 'win' | 'loss' | 'draw'

const TONE: Record<ResultKind, Tone> = {
  WIN_FLAWLESS: 'win',
  WIN: 'win',
  WO_WIN: 'win',
  LOSS: 'loss',
  WO_LOSS: 'loss',
  DRAW: 'draw',
}

const characterColor = (character: CharacterId | null | undefined) =>
  character ? CHARACTER_INFO[character].color : 'var(--color-line)'

interface SideProps {
  side: 'me' | 'opponent'
  character: CharacterId | null | undefined
  /** Rounds vencidos por este lado */
  rounds: number
  dimmed: boolean
}

/** Avatar do jogador e pips dos rounds que ele venceu; atenuado quando perdeu a partida */
function Side({ side, character, rounds, dimmed }: SideProps) {
  return (
    <div
      data-side={side}
      data-dimmed={dimmed || undefined}
      style={{ '--side': characterColor(character) } as CSSProperties}
      className={`flex flex-col items-center gap-1 ${dimmed ? 'opacity-60' : ''}`}
    >
      {character ? (
        <Character
          id={character}
          variant="avatar"
          decorative
          className="size-[clamp(2.25rem,calc(var(--u)*0.07),4rem)]"
        />
      ) : (
        <span className="size-[clamp(2.25rem,calc(var(--u)*0.07),4rem)] shrink-0 rounded-full border-2 border-line" />
      )}
      <div data-rounds-won={rounds} className="flex gap-1">
        {Array.from({ length: ROUNDS_TO_WIN_MATCH }, (_, i) => (
          <span
            key={i}
            className={`size-2 rounded-full border border-(--side) ${i < rounds ? 'bg-(--side)' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Tela de Resultado (FE-15) [RF-POS-01]: título, placar, Coins e, na coluna direita, a revanche
 * e o "Voltar ao Lobby" (FE-29). Só lê as stores: vencedor, placar e Coins vêm do servidor.
 * Em paisagem, esboço Tela 8: painel do resultado à esquerda, placar e botões à direita.
 */
export function ResultScreen({ onLeave }: ResultScreenProps) {
  const me = useRoomStore((s) => s.mySlot) ?? 'P1'
  const opp = otherSlot(me)
  const myCharacter = useRoomStore((s) => s.players.find((p) => p.slot === me)?.character)
  const oppCharacter = useRoomStore((s) => s.players.find((p) => p.slot === opp)?.character)
  const outcome = useMatchStore((s) => s.outcome)
  const score = useMatchStore((s) => s.score)
  const coins = useMatchStore((s) => s.coins)
  const result = classifyResult(outcome, score, me)
  // Um só ponto decide se o resultado acabou de chegar (ao vivo) ou se é o estado final (reconexão)
  const live = useLiveResult()
  const reduceMotion = useReducedMotion()

  if (!result) {
    // O servidor ainda não mandou o resultado: nada de "Derrota" por engano
    return (
      <section
        aria-label="Resultado"
        className="flex min-h-0 flex-1 gap-3.5 px-3 short:gap-2.5 short:px-2"
      >
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl border-[1.5px] border-line p-1.5 text-center">
          <p
            role="status"
            className="font-display text-2xl font-bold tracking-wide text-text-muted uppercase short:text-xl"
          >
            Apurando o resultado…
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <RematchPanel onLeave={onLeave} />
        </div>
      </section>
    )
  }

  const { kind, mine, theirs } = result
  const tone = TONE[kind]
  const subtitle = resultSubtitle(result)
  const isWo = kind === 'WO_WIN' || kind === 'WO_LOSS'
  // Festa só para quem venceu, ao vivo e sem "reduzir movimento"; fora disso, o estado final parado
  const flavor = celebrationFlavor(kind)
  const celebrate = live && flavor !== null && !reduceMotion

  // Vitória na cor do meu personagem; derrota em vermelho; empate neutro
  const accent =
    tone === 'win' ? characterColor(myCharacter) : tone === 'loss' ? 'var(--color-danger)' : null
  // O empate fica no neutro, com um brilho mais fraco que o dos outros resultados (30% da cor)
  const titleClass =
    tone === 'loss'
      ? 'text-danger'
      : tone === 'draw'
        ? 'text-text [text-shadow:0_0_18px_color-mix(in_srgb,var(--color-text)_30%,transparent)]'
        : ''
  const titleStyle: CSSProperties | undefined =
    tone === 'win'
      ? { color: accent ?? undefined, textShadow: `0 0 18px ${accent}` }
      : tone === 'loss'
        ? { textShadow: `0 0 18px ${accent}` }
        : undefined
  const winnerColor = accent ?? 'var(--color-primary)'

  // Quem perdeu fica atenuado; no empate ninguém
  const loser = tone === 'loss' ? 'me' : tone === 'win' ? 'opponent' : null
  // Coluna do resultado: o personagem de quem venceu (os dois, no empate)
  const panelCharacters = (
    tone === 'win' ? [myCharacter] : tone === 'loss' ? [oppCharacter] : [myCharacter, oppCharacter]
  ).filter((c): c is CharacterId => !!c)

  return (
    <section
      aria-label="Resultado"
      data-result={kind}
      // Contêiner: os tamanhos acompanham o espaço do Resultado (a sala inteira ou o quadro da
      // vitrine), não a janela do navegador. --u é o menor entre a altura e a metade da largura.
      className="flex min-h-0 flex-1 gap-3.5 px-3 [--u:min(100cqh,50cqw)] [container-type:size] short:gap-2.5 short:px-2"
    >
      {/* Painel do resultado (esboço: borda de 1,5px, raio 12; na cor do lado, ou neutra no empate) */}
      <div
        data-region="result-panel"
        style={{
          borderColor: accent ? `color-mix(in srgb, ${accent} 45%, transparent)` : undefined,
        }}
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-line p-1.5 text-center short:gap-1"
      >
        <motion.h1
          // Entra com impacto (spring, como o Banner); parado se não for ao vivo
          initial={celebrate ? { scale: 1.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.08 }}
          style={titleStyle}
          className={`max-w-full font-display text-[clamp(1.875rem,calc(var(--u)*0.07),4rem)] leading-none font-extrabold tracking-wide text-balance uppercase ${titleClass}`}
        >
          {kind === 'WIN_FLAWLESS' && celebrate ? (
            // Cintilação neon da vitória impecável: 2 ciclos depois do impacto e fica aceso
            <span
              className="motion-safe:animate-neon-flicker"
              style={{ animationDelay: '0.7s', animationIterationCount: 2 }}
            >
              {RESULT_TITLES[kind]}
            </span>
          ) : (
            RESULT_TITLES[kind]
          )}
        </motion.h1>
        {subtitle && (
          <p className="font-mono text-[clamp(0.625rem,calc(var(--u)*0.02),1rem)] tracking-wide text-text-muted">
            {subtitle}
          </p>
        )}
        <div className="flex items-end justify-center gap-2">
          {panelCharacters.map((id) => (
            <div
              key={id}
              // Pulinho do vencedor (o `hop` do esboço, finito), depois que o título pousa
              className={`relative flex ${celebrate ? 'animate-victory-hop' : ''}`}
              style={celebrate ? { animationDelay: '0.3s' } : undefined}
            >
              {flavor && <CelebrationHalo color={winnerColor} pulse={celebrate} />}
              {/* Animação normal do personagem em todo resultado (parado só com "reduzir movimento",
                  pelo próprio CSS): sem ela, a derrota e o empate pareciam tela travada. A festa
                  (pulinho, brilho e confete) continua só na vitória ao vivo */}
              <Character
                id={id}
                variant="full"
                className={
                  panelCharacters.length > 1
                    ? 'h-[clamp(6rem,calc(var(--u)*0.24),13rem)] w-auto'
                    : 'h-[clamp(9rem,calc(var(--u)*0.36),18rem)] w-auto'
                }
              />
            </div>
          ))}
        </div>
        {celebrate && flavor && <CelebrationBurst flavor={flavor} color={winnerColor} />}{' '}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 short:gap-1.5">
        <div
          role="img"
          aria-label={`Placar final: ${mine} × ${theirs}`}
          className="flex items-center gap-3 short:gap-2"
        >
          <Side side="me" character={myCharacter} rounds={mine} dimmed={loser === 'me'} />
          <p
            aria-hidden="true"
            className="font-display text-[clamp(1.875rem,calc(var(--u)*0.07),4rem)] leading-none font-bold tabular-nums"
          >
            <span className={loser === 'me' ? 'opacity-60' : ''}>{mine}</span>
            <span className="mx-1.5 text-text-muted">×</span>
            <span className={loser === 'opponent' ? 'opacity-60' : ''}>{theirs}</span>
          </p>
          <Side
            side="opponent"
            character={oppCharacter}
            rounds={theirs}
            dimmed={loser === 'opponent'}
          />
        </div>
        {isWo && (
          <span
            style={{ color: accent ?? undefined, borderColor: accent ?? undefined }}
            className="rounded-full border px-2 py-0.5 font-mono text-xs tracking-widest short:text-[10px]"
          >
            W.O.
          </span>
        )}
        {/* No empate a Arena já mostrou "+20 Coins para cada" nos 2s antes: aqui o valor fica parado */}
        <CoinsReward amount={coins?.[me]} countUp={live && kind !== 'DRAW'} />
        <RematchPanel onLeave={onLeave} />
      </div>
    </section>
  )
}
