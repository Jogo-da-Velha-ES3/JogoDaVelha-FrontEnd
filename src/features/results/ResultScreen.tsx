import type { CSSProperties } from 'react'
import { CHARACTER_INFO } from '../../constants/characters'
import { ROUNDS_TO_WIN_MATCH } from '../../constants/game'
import { otherSlot } from '../../lib/match'
import { classifyResult, type ResultKind } from '../../lib/result'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import type { CharacterId } from '../../types/game'
import { Character } from '../characters'
import { RematchPanel } from './RematchPanel'
import { RESULT_TITLES, resultSubtitle } from './resultTexts'

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

/** Coins desta partida como o servidor mandou; sem valor, texto neutro (nunca "+0") */
function coinsLabel(amount: number | undefined): string {
  if (amount === undefined) return 'Coins já creditados'
  return amount > 0 ? `+${amount} Coins` : '0 Coins'
}

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
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-line p-1.5 text-center short:gap-1"
      >
        <h1
          style={titleStyle}
          className={`max-w-full font-display text-[clamp(1.875rem,calc(var(--u)*0.07),4rem)] leading-none font-extrabold tracking-wide text-balance uppercase ${titleClass}`}
        >
          {RESULT_TITLES[kind]}
        </h1>
        {subtitle && (
          <p className="font-mono text-[clamp(0.625rem,calc(var(--u)*0.02),1rem)] tracking-wide text-text-muted">
            {subtitle}
          </p>
        )}
        <div className="flex items-end justify-center gap-2">
          {panelCharacters.map((id) => (
            <Character
              key={id}
              id={id}
              variant="full"
              animated={false}
              className={
                panelCharacters.length > 1
                  ? 'h-[clamp(6rem,calc(var(--u)*0.24),13rem)] w-auto'
                  : 'h-[clamp(9rem,calc(var(--u)*0.36),18rem)] w-auto'
              }
            />
          ))}
        </div>
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
        <p className="font-mono text-coin">{coinsLabel(coins?.[me])}</p>
        <RematchPanel onLeave={onLeave} />
      </div>
    </section>
  )
}
