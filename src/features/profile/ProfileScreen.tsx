import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Button, LockIcon } from '../../components/ui'
import { ABILITIES, CHARACTERS } from '../../constants/game'
import { ABILITY_INFO } from '../../constants/abilities'
import { CHARACTER_INFO } from '../../constants/characters'
import { PROFILE_SCREEN_TEXTS as T } from './profileTexts'
import { validateUsername } from '../../lib/authValidation'
import { AbilityIcon } from '../powers/AbilityIcon'
import { Character } from '../characters'
import { selectFavoriteCharacter, useProfileStore } from '../../stores/profileStore'

/** Perfil [FE-33] [RF-PRF-01] [RF-PRF-02]. Só exibe alterações após confirmação da API. */
export function ProfileScreen() {
  const navigate = useNavigate()
  const status = useProfileStore((s) => s.status)
  const profile = useProfileStore((s) => s.profile)
  const stats = useProfileStore((s) => s.stats)
  const characters = useProfileStore((s) => s.characters)
  const skills = useProfileStore((s) => s.skills)
  const rename = useProfileStore((s) => s.rename)
  const equip = useProfileStore((s) => s.equip)
  const favorite = useProfileStore(selectFavoriteCharacter)
  const favoriteColor = CHARACTER_INFO[favorite].color
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timeout)
  }, [notice])
  useEffect(() => {
    if (!error) return
    const timeout = window.setTimeout(() => setError(''), 3000)
    return () => window.clearTimeout(timeout)
  }, [error])

  async function submitNickname(event: FormEvent) {
    event.preventDefault()
    const validation = validateUsername(nickname)
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await rename(nickname.trim())
      setEditing(false)
      setNotice(T.saved)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : T.renameFailed)
    } finally {
      setSaving(false)
    }
  }

  async function chooseFavorite(id: string) {
    const item = characters.find((candidate) => candidate.code === id)
    if (!item?.owned || item.equipped) return
    setError('')
    setNotice('')
    try {
      await equip(item.id)
      setNotice(T.favoriteSaved)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : T.favoriteFailed)
    }
  }

  const matches = stats?.matchesPlayed ?? 0
  const wins = stats?.wins ?? 0
  const rate = matches === 0 ? 0 : (stats?.winRate ?? 0)
  const streak = stats?.longestWinStreak ?? 0
  const ownedCharacterCodes = new Set(
    characters.length
      ? characters.filter((item) => item.owned).map((item) => item.code)
      : ['X', 'O'],
  )
  const ownedSkillCodes = new Set(
    skills.length
      ? skills.filter((item) => item.owned).map((item) => item.code)
      : ['BOMBA', 'ESCUDO', 'AMPULHETA'],
  )

  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col py-1 short:py-0"
      aria-labelledby="profile-page-title"
    >
      <h1 id="profile-page-title" className="sr-only">
        {T.title}
      </h1>
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex justify-center">
        {status === 'loading' && (
          <span role="status" className="text-sm text-text-muted">
            {T.loading}
          </span>
        )}
      </div>
      {status === 'error' && (
        <p
          role="alert"
          className="absolute inset-x-2 top-2 z-20 rounded-lg border border-danger/50 bg-bg-deep px-3 py-2 text-sm text-danger"
        >
          {T.loadFailed}
        </p>
      )}
      <div className="relative grid min-h-0 flex-1 gap-2 overflow-hidden rounded-3xl border-2 border-line bg-bg-panel/80 p-2 shadow-glow shadow-char-x/10 md:grid-cols-[minmax(240px,.7fr)_minmax(0,2fr)] md:items-center md:p-8 short:gap-1 short:p-2">
        {(error || notice || status === 'error') && (
          <p
            role={error || status === 'error' ? 'alert' : 'status'}
            style={
              !error && status !== 'error'
                ? ({ '--notice-color': favoriteColor } as CSSProperties)
                : undefined
            }
            className={`absolute inset-x-3 bottom-2 z-20 min-h-8 rounded-lg border bg-bg-deep/95 px-3 py-1.5 text-xs md:bottom-4 md:text-sm ${error || status === 'error' ? 'border-danger/50 text-danger' : 'border-(color:--notice-color) text-(color:--notice-color)'}`}
          >
            {error || (status === 'error' ? T.loadFailed : notice)}
          </p>
        )}
        <section className="flex flex-col items-center justify-center gap-1 border-b border-line pb-2 text-center md:border-r md:border-b-0 md:pr-5 md:pb-0 short:gap-0 short:pb-1">
          <Character
            id={favorite}
            variant="full"
            animated
            className="h-12 w-12 short:h-8 short:w-8 md:h-36 md:w-36"
          />
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <h2 className="font-display text-xl font-bold">{profile?.username ?? T.loading}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setNickname(profile?.username ?? '')
                    setEditing(true)
                    setError('')
                    setNotice('')
                  }}
                  className="rounded-md px-2 py-1 text-primary hover:bg-bg-raised"
                  aria-label={T.editNickname}
                >
                  ✎
                </button>
              </>
            ) : null}
          </div>
          {editing && (
            <form onSubmit={(e) => void submitNickname(e)} className="w-full max-w-xs space-y-2">
              <label htmlFor="profile-nickname" className="sr-only">
                {T.nickname}
              </label>
              <input
                id="profile-nickname"
                autoFocus
                maxLength={15}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg-deep px-3 py-2 text-center text-text outline-none focus:border-primary"
              />
              <div className="flex justify-center gap-2">
                <Button size="sm" type="submit" disabled={saving}>
                  {saving ? T.saving : T.save}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false)
                    setError('')
                  }}
                >
                  {T.cancel}
                </Button>
              </div>
            </form>
          )}
          <p className="max-w-full truncate text-sm text-text-muted">
            {profile?.avatar ? T.account : T.emailUnavailable}
          </p>
          <p className="hidden text-xs text-text-muted md:block">{T.emailNote}</p>
        </section>

        <div className="flex min-w-0 flex-col gap-1 short:gap-0 md:gap-6">
          <section aria-label={T.statistics}>
            <h2 className="mb-2 font-display text-sm font-bold tracking-[.16em] text-text-muted uppercase">
              {T.statistics}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard label={T.matches} value={matches.toLocaleString('pt-BR')} />
              <StatCard label={T.wins} value={wins.toLocaleString('pt-BR')} />
              <StatCard label={T.winRate} value={`${rate.toLocaleString('pt-BR')}%`} />
              <StatCard label={T.longestStreak} value={streak.toLocaleString('pt-BR')} />
            </div>
          </section>

          <section aria-label={T.characters}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold tracking-[.16em] text-text-muted uppercase">
                {T.characters}
              </h2>
              <span className="font-mono text-xs text-text-muted">
                {ownedCharacterCodes.size}/6
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CHARACTERS.map((id) => {
                const owned = ownedCharacterCodes.has(id)
                const equipped = favorite === id
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={equipped}
                    onClick={() =>
                      owned
                        ? void chooseFavorite(id)
                        : navigate(`/loja?categoria=characters&item=${id}`)
                    }
                    aria-label={`${CHARACTER_INFO[id].name}${owned ? (equipped ? `, ${T.favorite}` : `, ${T.chooseFavorite}`) : `, ${T.locked}`}`}
                    title={!owned ? T.locked : equipped ? T.favorite : T.chooseFavorite}
                    className={`relative grid size-12 place-items-center rounded-full border bg-bg-deep transition short:size-10 ${equipped ? 'border-primary shadow-glow shadow-char-x/40' : 'border-line hover:border-primary'} ${owned ? '' : 'cursor-not-allowed opacity-25 grayscale'}`}
                  >
                    <Character id={id} variant="piece" decorative className="size-8 short:size-7" />
                    {!owned && (
                      <LockIcon className="absolute -right-1 -bottom-1 size-4 rounded-full bg-bg-panel p-0.5 text-text-muted" />
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <section aria-label={T.skills}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold tracking-[.16em] text-text-muted uppercase">
                {T.skills}
              </h2>
              <span className="font-mono text-xs text-text-muted">{ownedSkillCodes.size}/10</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ABILITIES.map((id) => {
                const owned = ownedSkillCodes.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (!owned) navigate(`/loja?categoria=skills&item=${id}`)
                    }}
                    title={owned ? ABILITY_INFO[id].name : `${ABILITY_INFO[id].name} · ${T.locked}`}
                    aria-label={`${ABILITY_INFO[id].name}${owned ? '' : `, ${T.locked}`}`}
                    style={{ '--skill-color': favoriteColor } as CSSProperties}
                    className={`relative grid size-11 place-items-center rounded-xl border bg-bg-deep text-(color:--skill-color) ${owned ? 'border-(color:--skill-color)' : 'border-line opacity-25 grayscale'}`}
                  >
                    <AbilityIcon ability={id} className="size-7" />
                    {!owned && (
                      <LockIcon className="absolute -right-1 -bottom-1 size-4 rounded-full bg-bg-panel p-0.5 text-text-muted" />
                    )}
                  </button>
                )
              })}
            </div>
          </section>
          <p className="text-xs text-text-muted">{T.collectionHint}</p>
        </div>
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-raised px-2 py-2 text-center short:py-1">
      <p className="font-display text-xl font-extrabold leading-none text-primary short:text-lg">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-tight text-text-muted">{label}</p>
    </div>
  )
}
