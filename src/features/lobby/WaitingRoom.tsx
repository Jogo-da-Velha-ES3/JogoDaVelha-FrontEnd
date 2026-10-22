// Sala de Espera e "Match feito" (FE-26) [RF-SAL-01] [RF-SAL-02] [RF-SAL-03]. Layout do esboço
// (Tela 5 de 8): sala e código à esquerda, os dois jogadores à direita.
// Só lê o roomStore: quem leva para a Preparação é o servidor (a fase muda sozinha para DRAFT).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui'
import { MATCH_FOUND_COUNTDOWN_SECONDS } from '../../constants/game'
import { otherSlot } from '../../lib/match'
import { PATHS } from '../../routes/paths'
import { useRoomStore } from '../../stores/roomStore'
import { showToast } from '../../stores/toastStore'
import type { PlayerSlot, PlayerState } from '../../types/game'
import { canShare, copyText, shareRoomLink } from './shareRoom'

export function WaitingRoom({ code }: { code: string }) {
  const navigate = useNavigate()
  const phase = useRoomStore((s) => s.phase)
  const mySlot = useRoomStore((s) => s.mySlot) ?? 'P1'
  const players = useRoomStore((s) => s.players)
  const matched = phase === 'MATCHED'

  const host = players.find((p) => p.slot === 'P1')
  const me = players.find((p) => p.slot === mySlot)
  const opponent = players.find((p) => p.slot === otherSlot(mySlot))

  return (
    <section className="flex flex-1 items-stretch gap-6 px-2 py-2 short:gap-4 short:py-0">
      <div className="flex flex-1 flex-col gap-3 short:gap-2">
        {/* A sala chama o leaveRoom sozinha ao sair da página */}
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => navigate(PATHS.play)}
        >
          ← Sair da sala
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 short:gap-2">
          {!matched && (
            <h1 className="font-display text-lg font-bold tracking-wide text-text-muted uppercase">
              Sala de {host?.nickname ?? 'Jogador'}
            </h1>
          )}
          <RoomCode code={code} />
          {matched ? (
            <MatchFound opponentName={opponent?.nickname ?? 'Oponente'} />
          ) : (
            <ShareButtons code={code} />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2">
        <PlayerSlotCard
          player={me}
          slot={mySlot}
          label={mySlot === 'P1' ? 'você · host' : 'você'}
        />
        <p
          aria-hidden
          className="text-center font-display text-xl font-extrabold text-text-muted short:text-lg"
        >
          VS
        </p>
        {opponent ? (
          <PlayerSlotCard
            player={opponent}
            slot={opponent.slot}
            label={opponent.slot === 'P1' ? 'host' : 'acabou de entrar'}
          />
        ) : (
          <EmptySlot />
        )}
      </div>
    </section>
  )
}

/** Código de 4 dígitos em destaque; o leitor de tela lê "Código da sala: 4 8 2 1" */
function RoomCode({ code }: { code: string }) {
  return (
    <div
      role="img"
      aria-label={`Código da sala: ${code.split('').join(' ')}`}
      className="flex gap-2"
    >
      {code.split('').map((digit, i) => (
        <span
          key={i}
          className="grid size-14 place-items-center rounded-xl border-2 border-primary/70 bg-bg-panel font-display text-4xl font-extrabold text-primary shadow-glow shadow-primary/20 short:size-12 short:text-3xl"
        >
          {digit}
        </span>
      ))}
    </div>
  )
}

function ShareButtons({ code }: { code: string }) {
  // Calculado uma vez: o celular tem a folha nativa, o desktop copia o link
  const [nativeShare] = useState(canShare)

  async function handleCopyCode() {
    const ok = await copyText(code)
    showToast(
      ok
        ? { message: 'Código copiado!' }
        : { message: `Não deu para copiar. O código é ${code}.`, tone: 'danger' },
    )
  }

  async function handleShare() {
    const result = await shareRoomLink(code)
    if (result === 'copied') showToast({ message: 'Link copiado!' })
    if (result === 'failed') {
      showToast({ message: 'Não deu para copiar o link. Passe o código da sala.', tone: 'danger' })
    }
    // 'shared' e 'cancelled': a folha nativa já deu o retorno
  }

  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-2">
      <Button variant="secondary" size="sm" onClick={() => void handleCopyCode()}>
        Copiar código
      </Button>
      <Button size="sm" onClick={() => void handleShare()}>
        {nativeShare ? 'Compartilhar' : 'Copiar link'}
      </Button>
    </div>
  )
}

/** "MATCH FEITO!" com a contagem 3 → 2 → 1 (só visual; quem muda de tela é o servidor) */
function MatchFound({ opponentName }: { opponentName: string }) {
  const seconds = useCountdown(MATCH_FOUND_COUNTDOWN_SECONDS)
  return (
    <div role="status" className="flex flex-col items-center gap-1 text-center">
      <h1 className="font-display text-4xl font-extrabold tracking-wide text-primary uppercase short:text-3xl">
        Match feito!
      </h1>
      <p className="font-display text-xl font-bold short:text-lg">{opponentName} entrou!</p>
      <p className="text-sm text-text-muted">
        {seconds > 0 ? (
          <>
            Preparação em <b className="text-primary">{seconds}</b>…
          </>
        ) : (
          'Preparando…'
        )}
      </p>
    </div>
  )
}

/** Conta de `from` até 0, um por segundo, a partir de quando o componente aparece */
function useCountdown(from: number) {
  const [seconds, setSeconds] = useState(from)
  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])
  return seconds
}

const SLOT_BORDER: Record<PlayerSlot, string> = {
  P1: 'border-char-x',
  P2: 'border-char-o',
}

// Sem personagem ainda (ele é escolhido na Preparação): o círculo mostra a inicial do apelido
function PlayerSlotCard({
  player,
  slot,
  label,
}: {
  player: PlayerState | undefined
  slot: PlayerSlot
  label: string
}) {
  const name = player?.nickname ?? 'Jogador'
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-bg-panel px-3 py-2 short:py-1.5">
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-full border-2 bg-bg-base font-display text-lg font-bold uppercase short:size-9 ${SLOT_BORDER[slot]}`}
      >
        {name.charAt(0)}
      </span>
      <div className="flex min-w-0 flex-col">
        <b className="truncate font-display text-lg leading-tight">{name}</b>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
    </div>
  )
}

function EmptySlot() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2 short:py-1.5">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-dashed border-line font-display text-lg text-text-muted short:size-9"
      >
        ?
      </span>
      <p role="status" className="animate-pulse text-text-muted motion-reduce:animate-none">
        Aguardando adversário…
      </p>
    </div>
  )
}
