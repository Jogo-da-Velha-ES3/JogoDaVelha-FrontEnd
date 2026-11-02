// Loja (FE-31) [RF-LOJ-01] [RF-LOJ-02] [RN-LOJ-01] a [RN-LOJ-03]. Layout do esboço (Tela 3 de 8):
// abas no alto e os itens em grade. Catálogo, saldo e compra vêm do profileStore (FE-30), que só
// muda com a resposta do servidor: nada aqui tira Coins nem marca item como comprado antes dela.
import { useId, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ApiError } from '../../api/client'
import type { ShopCategory, ShopItem } from '../../api/shop'
import { Button, HeartIcon, Modal } from '../../components/ui'
import { ABILITY_INFO } from '../../constants/abilities'
import { ABILITIES, CHARACTERS } from '../../constants/game'
import { SHOP_TEXTS } from '../../constants/texts'
import { knownItems, shopItemState, type ShopItemState } from '../../lib/shop'
import { useProfileStore } from '../../stores/profileStore'
import { showToast } from '../../stores/toastStore'
import type { AbilityId, CharacterId } from '../../types/game'
import { Character } from '../characters'
import { AbilityIcon } from '../powers/AbilityIcon'
import { SkillDemo } from './SkillDemo'

type Tab = 'characters' | 'skills' | 'cosmetics'
const TABS: Tab[] = ['characters', 'skills', 'cosmetics']

type CharacterItem = ShopItem & { code: CharacterId }
type SkillItem = ShopItem & { code: AbilityId }
type AnyItem = CharacterItem | SkillItem

const isCharacter = (item: AnyItem): item is CharacterItem => item.category === 'CHARACTERS'

export function ShopScreen() {
  const [tab, setTab] = useState<Tab>('characters')
  const [details, setDetails] = useState<AnyItem | null>(null)
  const [confirming, setConfirming] = useState<AnyItem | null>(null)
  const id = useId()
  const tabId = (t: Tab) => `${id}-aba-${t}`
  const panelId = `${id}-painel`

  const { status, balance, loadProfile } = useProfileStore(
    useShallow((s) => ({ status: s.status, balance: s.coinsBalance, loadProfile: s.loadProfile })),
  )
  const equip = useProfileStore((s) => s.equip)
  const [equippingId, setEquippingId] = useState<string | null>(null)
  const characters = useProfileStore((s) => s.characters)
  const skills = useProfileStore((s) => s.skills)
  const characterItems = knownItems(characters, CHARACTERS)
  const skillItems = knownItems(skills, ABILITIES)

  // Item aberto sempre com o estado mais novo do servidor (ex: virou "Seu" depois da compra)
  const fresh = (item: AnyItem | null): AnyItem | null =>
    item &&
    ((isCharacter(item)
      ? characterItems.find((c) => c.id === item.id)
      : skillItems.find((s) => s.id === item.id)) ??
      item)

  // O coração só enche com a resposta do servidor; até lá, pulsa (nada otimista)
  async function handleFavorite(item: CharacterItem) {
    setEquippingId(item.id)
    try {
      await equip(item.id)
      showToast({ message: SHOP_TEXTS.equipped(item.name) })
    } catch (error) {
      showToast({ tone: 'danger', message: shopErrorMessage(error) })
    } finally {
      setEquippingId(null)
    }
  }

  const empty =
    tab !== 'cosmetics' && (tab === 'characters' ? characterItems : skillItems).length === 0

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 short:gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-extrabold tracking-wide text-primary uppercase short:text-xl">
          {SHOP_TEXTS.title}
        </h1>
        <div
          role="tablist"
          aria-label={SHOP_TEXTS.title}
          className="flex gap-1 rounded-xl bg-bg-panel p-1"
        >
          {TABS.map((t) => (
            <button
              key={t}
              id={tabId(t)}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls={panelId}
              onClick={() => setTab(t)}
              className={[
                'min-h-9 rounded-lg px-3 font-display text-sm font-bold tracking-wide uppercase transition short:min-h-8 short:px-2 short:text-xs',
                tab === t
                  ? 'bg-bg-raised text-primary shadow-glow shadow-primary/20'
                  : 'text-text-muted hover:text-primary',
              ].join(' ')}
            >
              {SHOP_TEXTS.tabs[t]}
              {t === 'cosmetics' && (
                <span className="ml-1 font-sans text-[10px] font-normal tracking-normal normal-case">
                  · {SHOP_TEXTS.soon.toLowerCase()}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* A FE-32 (Manotega) liga este botão ao modal de compra simbólica de Coins */}
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          disabled
          title={SHOP_TEXTS.buyCoinsSoon}
        >
          + {SHOP_TEXTS.buyCoins}
        </Button>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        {tab === 'cosmetics' ? (
          <p className="m-auto max-w-sm text-center text-sm text-text-muted">
            <b className="block font-display text-lg tracking-wide text-primary uppercase">
              {SHOP_TEXTS.soon}
            </b>
            {SHOP_TEXTS.cosmeticsSoon}
          </p>
        ) : empty ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center text-sm text-text-muted">
            {status === 'error' ? (
              <>
                <p>{SHOP_TEXTS.loadError}</p>
                <Button size="sm" variant="secondary" onClick={() => void loadProfile()}>
                  {SHOP_TEXTS.retry}
                </Button>
              </>
            ) : (
              <p role="status">{SHOP_TEXTS.loading}</p>
            )}
          </div>
        ) : (
          <ul
            className={[
              'grid min-h-0 flex-1 gap-2 overflow-y-auto p-0.5 short:gap-1.5',
              tab === 'characters'
                ? 'grid-cols-3 grid-rows-2'
                : 'auto-rows-fr grid-cols-2 sm:grid-cols-5',
            ].join(' ')}
          >
            {(tab === 'characters' ? characterItems : skillItems).map((item) => (
              <li key={item.id} className="flex min-h-0">
                <ItemCard
                  item={item}
                  state={shopItemState(item, balance)}
                  onDetails={() => setDetails(item)}
                  onBuy={() => setConfirming(item)}
                  favorite={
                    isCharacter(item) && item.owned
                      ? {
                          pending: equippingId === item.id,
                          disabled: equippingId !== null,
                          onToggle: () => void handleFavorite(item),
                        }
                      : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ItemModal
        item={fresh(details)}
        balance={balance}
        onClose={() => setDetails(null)}
        onBuy={(item) => setConfirming(item)}
      />
      <ConfirmModal item={fresh(confirming)} balance={balance} onDone={() => setConfirming(null)} />
    </section>
  )
}

function ItemVisual({ item, className }: { item: AnyItem; className: string }) {
  return isCharacter(item) ? (
    <Character id={item.code} decorative animated={false} className={className} />
  ) : (
    <AbilityIcon ability={item.code} className={`text-primary ${className}`} />
  )
}

/** Card com os 3 estados: Seu, À venda (preço) e Sem saldo (botão travado com o que falta) */
/** Coração do card de personagem comprado. `null` nos outros cards */
interface FavoriteControl {
  /** Esperando o servidor confirmar este personagem */
  pending: boolean
  /** Alguma troca de favorito em andamento */
  disabled: boolean
  onToggle: () => void
}

function ItemCard({
  item,
  state,
  onDetails,
  onBuy,
  favorite,
}: {
  item: AnyItem
  state: ShopItemState
  onDetails: () => void
  onBuy: () => void
  favorite: FavoriteControl | null
}) {
  const subtitle = isCharacter(item) ? null : SHOP_TEXTS.kinds[ABILITY_INFO[item.code].kind]
  return (
    <div
      className={[
        'relative flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border-2 bg-bg-panel transition',
        item.equipped
          ? 'border-primary/70'
          : state.kind === 'OWNED'
            ? 'border-line'
            : 'border-line hover:border-primary/60',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onDetails}
        aria-label={SHOP_TEXTS.details(item.name)}
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-2 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary short:flex-row short:justify-start short:gap-2 short:p-1.5"
      >
        <ItemVisual
          item={item}
          className="h-[60%] max-h-24 min-h-8 w-auto max-w-full shrink-0 short:h-[85%] short:max-w-[45%]"
        />
        <span className="flex min-w-0 flex-col items-center short:items-start">
          <span className="truncate font-display text-sm font-bold text-primary">{item.name}</span>
          {subtitle && <span className="text-[10px] text-text-muted sm:text-xs">{subtitle}</span>}
        </span>
      </button>

      {/* Fora do botão do card: um botão dentro de outro não é HTML válido */}
      {favorite && (
        <button
          type="button"
          aria-pressed={item.equipped}
          aria-label={
            item.equipped ? SHOP_TEXTS.isFavorite(item.name) : SHOP_TEXTS.useAsFavorite(item.name)
          }
          title={
            item.equipped ? SHOP_TEXTS.isFavorite(item.name) : SHOP_TEXTS.useAsFavorite(item.name)
          }
          // O favorito não se desmarca: o jogador sempre tem um, e trocar é marcar outro
          disabled={item.equipped || favorite.disabled}
          onClick={favorite.onToggle}
          className={[
            'absolute top-1 right-1 grid size-9 place-items-center rounded-full transition',
            'focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default',
            item.equipped
              ? 'text-primary drop-shadow-[0_0_6px_var(--color-primary)]'
              : 'text-text-muted hover:text-primary',
            favorite.pending ? 'animate-pulse text-primary' : '',
          ].join(' ')}
        >
          <HeartIcon filled={item.equipped} className="size-5" />
        </button>
      )}

      <div className="shrink-0 px-2 pb-2 short:px-1.5 short:pb-1.5">
        {state.kind === 'OWNED' ? (
          <p className="flex min-h-8 items-center justify-center rounded-lg bg-bg-raised font-display text-xs font-bold tracking-wide text-text-muted uppercase">
            {SHOP_TEXTS.owned}
          </p>
        ) : (
          <Button
            size="sm"
            block
            variant="secondary"
            className="min-h-8 normal-case"
            disabled={state.kind === 'MISSING'}
            aria-label={
              state.kind === 'MISSING'
                ? `${item.name}: ${SHOP_TEXTS.missing(state.missing)}`
                : SHOP_TEXTS.buyAria(item.name, item.priceCoins)
            }
            onClick={onBuy}
          >
            {state.kind === 'MISSING' ? (
              SHOP_TEXTS.missing(state.missing)
            ) : (
              <>
                <span aria-hidden className="text-coin">
                  ●
                </span>
                {item.priceCoins.toLocaleString('pt-BR')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

/** Detalhe do item: personagem grande e animado, ou a demonstração em loop da habilidade */
function ItemModal({
  item,
  balance,
  onClose,
  onBuy,
}: {
  item: AnyItem | null
  balance: number | null
  onClose: () => void
  onBuy: (item: AnyItem) => void
}) {
  const state = item ? shopItemState(item, balance) : null

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={item?.name ?? ''}
      size="md"
      actions={
        item &&
        state && (
          <>
            <Button variant="ghost" onClick={onClose}>
              {SHOP_TEXTS.close}
            </Button>
            {state.kind !== 'OWNED' && (
              <Button
                className="normal-case"
                disabled={state.kind === 'MISSING'}
                onClick={() => onBuy(item)}
              >
                {state.kind === 'MISSING'
                  ? SHOP_TEXTS.missing(state.missing)
                  : SHOP_TEXTS.buy(item.priceCoins)}
              </Button>
            )}
          </>
        )
      }
    >
      {item && (
        <div className="flex items-center gap-4 short:gap-3">
          {isCharacter(item) ? (
            <Character id={item.code} animated className="h-36 w-auto shrink-0 short:h-28" />
          ) : (
            <SkillDemo ability={item.code} label={SHOP_TEXTS.demoLabel(item.name)} />
          )}
          <div className="flex min-w-0 flex-col gap-1 text-sm">
            {!isCharacter(item) && (
              <span className="text-xs text-text-muted">
                {SHOP_TEXTS.kinds[ABILITY_INFO[item.code].kind]}
              </span>
            )}
            <p>
              {isCharacter(item) ? SHOP_TEXTS.characterHint : ABILITY_INFO[item.code].description}
            </p>
            {!isCharacter(item) && <p className="text-text-muted">{SHOP_TEXTS.skillHint}</p>}
            <p className="font-display font-bold text-coin">
              {state?.kind === 'OWNED' ? SHOP_TEXTS.owned : SHOP_TEXTS.price(item.priceCoins)}
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Confirmação da compra: só fecha com a resposta do servidor (ou ao cancelar antes de enviar) */
function ConfirmModal({
  item,
  balance,
  onDone,
}: {
  item: AnyItem | null
  balance: number | null
  onDone: () => void
}) {
  const buy = useProfileStore((s) => s.buy)
  const [buying, setBuying] = useState(false)

  async function handleConfirm(target: AnyItem) {
    setBuying(true)
    const category: ShopCategory = target.category
    try {
      await buy(category, target.id)
      showToast({ tone: 'coin', message: SHOP_TEXTS.bought(target.name) })
    } catch (error) {
      showToast({ tone: 'danger', message: shopErrorMessage(error) })
    } finally {
      setBuying(false)
      onDone()
    }
  }

  return (
    <Modal
      open={item !== null}
      onClose={buying ? undefined : onDone}
      dismissible={!buying}
      title={item ? SHOP_TEXTS.confirmTitle(item.name) : ''}
      size="sm"
      actions={
        item && (
          <>
            <Button variant="ghost" onClick={onDone} disabled={buying}>
              {SHOP_TEXTS.cancel}
            </Button>
            <Button disabled={buying} onClick={() => void handleConfirm(item)}>
              {buying ? SHOP_TEXTS.buying : SHOP_TEXTS.confirm}
            </Button>
          </>
        )
      }
    >
      {item && (
        <div className="flex items-center gap-3">
          <ItemVisual item={item} className="h-14 w-auto shrink-0" />
          <p className="text-sm">
            {SHOP_TEXTS.confirmBody(item.priceCoins, (balance ?? 0) - item.priceCoins)}
          </p>
        </div>
      )}
    </Modal>
  )
}

/** Mensagem do erro da compra ou do equipar, pelo `code` do back */
function shopErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return SHOP_TEXTS.errors.generic
  switch (error.code) {
    case 'INSUFFICIENT_COINS':
      return SHOP_TEXTS.errors.insufficientCoins
    case 'SHOP_ITEM_ALREADY_OWNED':
      return SHOP_TEXTS.errors.alreadyOwned
    case 'SHOP_ITEM_NOT_OWNED':
      return SHOP_TEXTS.errors.notOwned
    case 'NETWORK':
      return error.message
    default:
      return SHOP_TEXTS.errors.generic
  }
}
