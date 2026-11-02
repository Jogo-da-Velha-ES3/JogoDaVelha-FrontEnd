import { useId, type ReactNode } from 'react'
import { Modal } from '../../components/ui'
import { SETTINGS_TEXTS as T } from '../../constants/texts'
import { useSettingsStore } from '../../stores/settingsStore'
import { playSound } from '../sound'

export interface SettingsModalProps {
  open: boolean
  /** No X, no Esc e no clique fora (na pausa da Arena, volta para o menu) */
  onClose: () => void
}

/**
 * Modal de Configurações (FE-39): som, música, voz, Vitão, filtro de palavrões e vibração. Abre
 * pelo Hub e pela pausa da Arena (o timer continua). Cada mudança vale na hora e fica guardada no
 * aparelho (`settingsStore`), então não tem botão de salvar; duas colunas e sem rodapé para caber
 * no celular deitado.
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings = useSettingsStore()
  const { update } = settings

  return (
    <Modal open={open} onClose={onClose} title={T.title} size="lg">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <SettingsGroup title="Som">
          <SwitchRow
            label="Música"
            checked={settings.musicOn}
            onChange={(musicOn) => update({ musicOn })}
          >
            <VolumeSlider
              label="Volume da música"
              value={settings.musicVolume}
              disabled={!settings.musicOn}
              onChange={(musicVolume) => update({ musicVolume })}
            />
          </SwitchRow>
          <SwitchRow
            label="Efeitos"
            checked={settings.sfxOn}
            onChange={(sfxOn) => update({ sfxOn })}
          >
            <VolumeSlider
              label="Volume dos efeitos"
              value={settings.sfxVolume}
              disabled={!settings.sfxOn}
              onChange={(sfxVolume) => update({ sfxVolume })}
              // Um clique de exemplo ao soltar, para ouvir o volume novo
              onCommit={() => playSound('botao')}
            />
          </SwitchRow>
          <Row label="Voz do Vitão" hint={T.voiceSoon}>
            <VolumeSlider
              label="Volume da voz do Vitão"
              value={settings.voiceVolume}
              disabled={!settings.vitaoOn}
              onChange={(voiceVolume) => update({ voiceVolume })}
            />
          </Row>
          <p className="mt-auto text-xs">{T.savedHint}</p>
        </SettingsGroup>

        <SettingsGroup title="Jogo">
          <SwitchRow
            label="Vitão"
            hint={T.vitaoHint}
            checked={settings.vitaoOn}
            onChange={(vitaoOn) => update({ vitaoOn })}
          />
          <SwitchRow
            label="Filtro de palavrões"
            hint={T.filterHint}
            checked={settings.languageFilter}
            onChange={(languageFilter) => update({ languageFilter })}
          />
          <SwitchRow
            label="Vibração"
            hint={T.vibrationHint}
            checked={settings.vibrationOn}
            onChange={(vibrationOn) => update({ vibrationOn })}
          />
        </SettingsGroup>
      </div>
    </Modal>
  )
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5 short:gap-2">
      <h3 className="font-display text-sm font-bold tracking-wide text-primary uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Linha com o nome à esquerda, o controle à direita e a dica embaixo */
function Row({
  label,
  hint,
  control,
  children,
}: {
  label: ReactNode
  hint?: string
  control?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 font-body text-sm text-text">{label}</span>
        {children}
        {control}
      </div>
      {hint && <p className="text-[11px] leading-tight">{hint}</p>}
    </div>
  )
}

/** Liga/desliga, com o volume (children) ao lado quando houver */
function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  children,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
}) {
  const labelId = useId()
  return (
    <Row
      label={<span id={labelId}>{label}</span>}
      hint={hint}
      control={
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 shrink-0 rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${checked ? 'border-primary bg-primary/25' : 'border-line bg-bg-deep'}`}
        >
          <span
            aria-hidden
            className={`absolute top-0.5 size-4 rounded-full transition-[left,background-color] ${checked ? 'left-5.5 bg-primary shadow-glow shadow-primary/50' : 'left-0.5 bg-text-muted'}`}
          />
        </button>
      }
    >
      {children}
    </Row>
  )
}

function VolumeSlider({
  label,
  value,
  disabled,
  onChange,
  onCommit,
}: {
  label: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
  /** Chamado ao soltar o controle (mouse, toque ou teclado) */
  onCommit?: () => void
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={Math.round(value * 100)}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={`${Math.round(value * 100)}%`}
      onChange={(event) => onChange(Number(event.target.value) / 100)}
      onPointerUp={onCommit}
      onKeyUp={onCommit}
      className="w-24 accent-(--color-primary) disabled:opacity-40 short:w-20"
    />
  )
}
