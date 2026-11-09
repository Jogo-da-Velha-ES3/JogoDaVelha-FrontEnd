// Modal "Entrar com Código" (FE-06) [RF-HUB-05] [RN-HUB-01]: 4 campos numéricos, colar, ENTRAR só
// com os 4 dígitos e erro em vermelho mantendo os campos. Layout do esboço: tudo numa linha.
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinRoomByCode } from '../../api/rooms'
import { ApiError } from '../../api/client'
import { Button, Modal } from '../../components/ui'
import { ROOM_TEXTS } from '../../constants/texts'
import {
  emptyDigits,
  eraseDigit,
  fillDigits,
  isCodeComplete,
  typedText,
  type CodeDigits,
} from '../../lib/roomCodeInput'
import { roomPath } from '../../routes/paths'

interface JoinRoomModalProps {
  open: boolean
  onClose: () => void
}

export function JoinRoomModal({ open, onClose }: JoinRoomModalProps) {
  // Esperando o servidor, o modal não fecha: a resposta levaria para a sala com ele já fechado
  const [pending, setPending] = useState(false)
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title="Código da sala"
      size="sm"
      placement="top"
    >
      {/* Montado só enquanto aberto: reabrir começa com os campos vazios */}
      {open && <JoinRoomForm pending={pending} setPending={setPending} />}
    </Modal>
  )
}

interface JoinRoomFormProps {
  pending: boolean
  setPending: (pending: boolean) => void
}

function JoinRoomForm({ pending, setPending }: JoinRoomFormProps) {
  const navigate = useNavigate()
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const [digits, setDigits] = useState<CodeDigits>(emptyDigits)
  const [error, setError] = useState<string | null>(null)
  const complete = isCodeComplete(digits)

  useEffect(() => inputs.current[0]?.focus(), [])

  function update(next: { digits: CodeDigits; focus: number }) {
    setDigits(next.digits)
    setError(null)
    inputs.current[next.focus]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      update(eraseDigit(digits, index))
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < digits.length - 1) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    update(fillDigits(digits, index, event.clipboardData.getData('text')))
  }

  async function handleSubmit() {
    if (!complete || pending) return
    const code = digits.join('')
    setPending(true)
    setError(null)
    try {
      // Só navega quando o servidor confirma a entrada (nada otimista)
      const room = await joinRoomByCode(code)
      navigate(roomPath(room.code))
    } catch (err) {
      // joinRoomByCode já traduz: "Sala 4821 não encontrada.", "já está cheia", "já começou"
      setError(err instanceof ApiError ? err.message : ROOM_TEXTS.errors.joinFailed)
      setPending(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit()
      }}
      className="flex flex-col items-center gap-2 pb-1"
    >
      <div className="flex items-center gap-3">
        <div role="group" aria-label="Código de 4 dígitos" className="flex gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputs.current[index] = el
              }}
              value={digit}
              inputMode="numeric"
              pattern="[0-9]*"
              // O celular pode sugerir o código de um SMS; sem maxLength para ele chegar inteiro
              autoComplete="one-time-code"
              aria-label={`Dígito ${index + 1}`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'codigo-sala-erro' : undefined}
              disabled={pending}
              onChange={(e) => update(fillDigits(digits, index, typedText(digit, e.target.value)))}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              onFocus={(e) => e.target.select()}
              className={[
                'size-12 rounded-xl border-2 bg-bg-base text-center font-display text-2xl font-bold text-text outline-none short:size-11',
                'transition focus:border-primary focus:shadow-glow focus:shadow-primary/20',
                error ? 'border-danger text-danger' : 'border-line',
              ].join(' ')}
            />
          ))}
        </div>
        <Button type="submit" disabled={!complete || pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </div>
      {error && (
        <p id="codigo-sala-erro" role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  )
}
