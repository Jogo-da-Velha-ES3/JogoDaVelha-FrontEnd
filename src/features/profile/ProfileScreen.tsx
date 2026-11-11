import { type CSSProperties, type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { ApiError } from '../../api/client'
import type { ShopItem } from '../../api/shop'
import { Button, LockIcon, PencilIcon } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import { ABILITIES, CHARACTERS } from '../../constants/game'
import { PROFILE_TEXTS as T } from '../../constants/texts'
import { USERNAME_MAX, validateUsername } from '../../lib/authValidation'
import { shopPath } from '../../routes/paths'
import {
  selectFavoriteCharacter,
  selectOwnedAbilities,
  selectOwnedCharacters,
  useProfileStore,
} from '../../stores/profileStore'
import { showToast } from '../../stores/toastStore'
import { Character } from '../characters'
import { AbilityIcon } from '../powers/AbilityIcon'

/** Taxa de vitória com no máximo 1 casa: o back manda o valor sem arredondar (ex: 66,666…) */
const formatRate = (rate: number) =>
  `${rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

/** Erro da troca de apelido pelo `code` do back, embaixo do campo */
function renameErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return T.renameFailed
  switch (error.code) {
    case 'USERNAME_ALREADY_EXISTS':
      return T.errors.usernameTaken
    case 'VALIDATION_ERROR':
      return error.fields.username ?? T.renameFailed
    case 'NETWORK':
      return error.message
    default:
      return T.renameFailed
  }
}

/**
 * Perfil [FE-33] [RF-PRF-01] [RF-PRF-02]: apelido editável, estatísticas e coleção. Apelido e
 * favorito só mudam com a resposta do servidor (o profileStore só grava o que ele confirmou).
 */
export function ProfileScreen() {
  const navigate = useNavigate()
  const status = useProfileStore((s) => s.status)
  const profile = useProfileStore((s) => s.profile)
  const stats = useProfileStore((s) => s.stats)
  const characters = useProfileStore((s) => s.characters)
  const loadProfile = useProfileStore((s) => s.loadProfile)
  const rename = useProfileStore((s) => s.rename)
  const equip = useProfileStore((s) => s.equip)
  const favorite = useProfileStore(selectFavoriteCharacter)
  const ownedCharacters = useProfileStore(useShallow(selectOwnedCharacters))
  const ownedAbilities = useProfileStore(useShallow(selectOwnedAbilities))
  const favoriteColor = CHARACTER_INFO[favorite].color

  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  /** Erro do apelido: fica embaixo do campo até a pessoa mexer nele ou cancelar */
  const [fieldError, setFieldError] = useState<string | null>(null)
  /** Personagem esperando o servidor confirmar como favorito */
  const [equippingId, setEquippingId] = useState<string | null>(null)

  function startEditing() {
    setNickname(profile?.username ?? '')
    setFieldError(null)
    setEditing(true)
  }

  async function submitNickname(event: FormEvent) {
    event.preventDefault()
    const invalid = validateUsername(nickname)
    if (invalid) {
      setFieldError(invalid)
      return
    }
    setSaving(true)
    setFieldError(null)
    try {
      await rename(nickname.trim())
      setEditing(false)
      showToast({ message: T.renamed })
    } catch (error) {
      setFieldError(renameErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function chooseFavorite(item: ShopItem) {
    setEquippingId(item.id)
    try {
      await equip(item.id)
      showToast({ message: T.favoriteSaved(item.name) })
    } catch {
      showToast({ tone: 'danger', message: T.favoriteFailed })
    } finally {
      setEquippingId(null)
    }
  }

  // O perfil não chegou nem uma vez (ex: back fora do ar). Se só uma recarga falhar, fica o último
  if (status === 'error' && profile === null) {
    return (
      <section className="m-auto flex flex-col items-center gap-2 text-center text-sm">
        <h1 className="sr-only">{T.title}</h1>
        <p role="alert" className="text-danger">
          {T.loadError}
        </p>
        <Button size="sm" variant="secondary" onClick={() => void loadProfile()}>
          {T.retry}
        </Button>
      </section>
    )
  }

  // Até as estatísticas chegarem, "–" em vez de um 0 que depois muda
  const statValue = (value: (s: NonNullable<typeof stats>) => string) =>
    stats ? value(stats) : T.loadingStat
  const count = (n: number) => n.toLocaleString('pt-BR')

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="profile-page-title">
      <h1 id="profile-page-title" className="sr-only">
        {T.title}
      </h1>
      {/* Duas colunas também no celular deitado; se ainda assim não couber, rola por dentro */}
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto rounded-3xl border-2 border-line bg-bg-panel/80 p-2 shadow-glow shadow-char-x/10 md:grid-cols-[minmax(240px,.7fr)_minmax(0,2fr)] md:content-center-safe md:items-center md:p-8 short:grid-cols-[minmax(150px,.55fr)_minmax(0,2fr)] short:content-center-safe short:items-center short:gap-3 short:p-2.5">
        <section className="flex flex-col items-center justify-center gap-1 border-b border-line pb-2 text-center md:border-r md:border-b-0 md:pr-5 md:pb-0 short:border-r short:border-b-0 short:pr-3 short:pb-0">
          <Character
            id={favorite}
            variant="full"
            animated
            className="size-12 md:size-36 short:size-16"
          />
          {editing ? (
            <form
              onSubmit={(event) => void submitNickname(event)}
              className="flex w-full max-w-xs flex-col items-center gap-1.5"
              noValidate
            >
              <label htmlFor="profile-nickname" className="sr-only">
                {T.nickname}
              </label>
              <input
                id="profile-nickname"
                autoFocus
                maxLength={USERNAME_MAX}
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value)
                  setFieldError(null)
                }}
                aria-invalid={fieldError !== null}
                aria-describedby={fieldError ? 'profile-nickname-error' : undefined}
                className="w-full rounded-lg border border-line bg-bg-deep px-3 py-1.5 text-center text-text outline-none focus:border-primary aria-invalid:border-danger"
              />
              {fieldError && (
                <p id="profile-nickname-error" role="alert" className="text-xs text-danger">
                  {fieldError}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" type="submit" disabled={saving}>
                  {saving ? T.saving : T.save}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false)
                    setFieldError(null)
                  }}
                >
                  {T.cancel}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex max-w-full items-center gap-1">
              <h2 className="truncate font-display text-xl font-bold short:text-lg">
                {profile?.username ?? T.loadingNickname}
              </h2>
              <button
                type="button"
                onClick={startEditing}
                disabled={!profile}
                aria-label={T.editNickname}
                title={T.editNickname}
                className="grid size-8 shrink-0 place-items-center rounded-md text-primary hover:bg-bg-raised disabled:opacity-40"
              >
                <PencilIcon className="size-4" />
              </button>
            </div>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-3 md:gap-6 short:gap-1.5">
          <section aria-label={T.statistics}>
            <SectionTitle title={T.statistics} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 short:grid-cols-4 short:gap-1.5">
              <StatCard label={T.matches} value={statValue((s) => count(s.matchesPlayed))} />
              <StatCard label={T.wins} value={statValue((s) => count(s.wins))} />
              <StatCard
                label={T.winRate}
                value={statValue((s) => formatRate(s.matchesPlayed === 0 ? 0 : s.winRate))}
              />
              <StatCard
                label={T.longestStreak}
                value={statValue((s) => count(s.longestWinStreak))}
              />
            </div>
          </section>

          <section aria-label={T.characters}>
            <SectionTitle
              title={T.characters}
              owned={ownedCharacters.length}
              total={CHARACTERS.length}
            />
            <ul className="flex flex-wrap gap-2 short:gap-1.5">
              {CHARACTERS.map((id) => {
                const name = CHARACTER_INFO[id].name
                const owned = ownedCharacters.includes(id)
                const equipped = favorite === id
                const item = characters.find((candidate) => candidate.code === id)
                const pending = item !== undefined && equippingId === item.id
                const state = owned ? (equipped ? T.favorite : T.chooseFavorite) : T.locked
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={equipped || equippingId !== null}
                      onClick={() => {
                        if (!owned) navigate(shopPath('characters'))
                        else if (item) void chooseFavorite(item)
                      }}
                      aria-label={T.itemLabel(name, state)}
                      title={state}
                      className={[
                        'relative grid size-12 place-items-center rounded-full border bg-bg-deep transition short:size-10 max-sm:short:size-9',
                        equipped
                          ? 'border-primary shadow-glow shadow-char-x/40'
                          : 'border-line hover:border-primary',
                        owned ? '' : 'opacity-25 grayscale',
                        pending ? 'animate-pulse' : '',
                      ].join(' ')}
                    >
                      <Character
                        id={id}
                        variant="piece"
                        decorative
                        className="size-8 short:size-7 max-sm:short:size-6"
                      />
                      {!owned && (
                        <LockIcon className="absolute -right-1 -bottom-1 size-4 rounded-full bg-bg-panel p-0.5 text-text-muted" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-label={T.skills}>
            <SectionTitle title={T.skills} owned={ownedAbilities.length} total={ABILITIES.length} />
            <ul
              className="flex flex-wrap gap-2 short:gap-1.5"
              style={{ '--skill-color': favoriteColor } as CSSProperties}
            >
              {ABILITIES.map((id) => {
                const name = ABILITY_INFO[id].name
                const icon = (
                  <AbilityIcon ability={id} className="size-7 short:size-6 max-sm:short:size-5" />
                )
                // A habilidade que o jogador tem só aparece; a bloqueada leva à Loja
                return (
                  <li key={id}>
                    {ownedAbilities.includes(id) ? (
                      <span
                        role="img"
                        aria-label={name}
                        title={name}
                        className="grid size-11 place-items-center rounded-xl border border-(color:--skill-color) bg-bg-deep text-(color:--skill-color) short:size-9 max-sm:short:size-8"
                      >
                        {icon}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(shopPath('skills'))}
                        aria-label={T.itemLabel(name, T.locked)}
                        title={`${name} · ${T.locked}`}
                        className="relative grid size-11 place-items-center rounded-xl border border-line bg-bg-deep text-(color:--skill-color) opacity-25 grayscale transition hover:opacity-50 short:size-9 max-sm:short:size-8"
                      >
                        {icon}
                        <LockIcon className="absolute -right-1 -bottom-1 size-4 rounded-full bg-bg-panel p-0.5 text-text-muted" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
          {/* No celular deitado estreito não cabe; ali os cadeados já dizem que é para a Loja */}
          <p className="text-xs text-text-muted max-sm:short:hidden">{T.collectionHint}</p>
        </div>
      </div>
    </section>
  )
}

function SectionTitle({ title, owned, total }: { title: string; owned?: number; total?: number }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 short:mb-1">
      <h2 className="font-display text-sm font-bold tracking-[.16em] text-text-muted uppercase short:text-xs">
        {title}
      </h2>
      {owned !== undefined && total !== undefined && (
        <span
          aria-label={T.ownedCountLabel(owned, total)}
          className="font-mono text-xs text-text-muted"
        >
          {T.ownedCount(owned, total)}
        </span>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-raised px-2 py-2 text-center short:px-1 short:py-1">
      <p className="font-display text-xl leading-none font-extrabold text-primary short:text-lg">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-tight text-text-muted short:mt-0.5 short:text-[10px]">
        {label}
      </p>
    </div>
  )
}
