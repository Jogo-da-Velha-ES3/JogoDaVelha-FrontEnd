// Comprar Coins (FE-32) [RN-LOJ-03] [RN-LOJ-04]: modal de pacotes simbólicos, sem pagamento real
// nem cartão, com crédito imediato. O saldo só muda depois da resposta da API (nada otimista):
// o modal nunca soma Coins por conta própria; o saldo novo vem do profileStore após a resposta,
// e o toast só aparece depois dela.
import { useEffect, useState } from 'react'
import { getCoinPackages, type CoinPackage } from '../../api/shop'
import { Button, Modal } from '../../components/ui'
import { COINS_TEXTS } from '../../constants/texts'
import { useProfileStore } from '../../stores/profileStore'
import { showToast } from '../../stores/toastStore'

interface BuyCoinsModalProps {
  open: boolean
  onClose: () => void
}

/**
 * Aberto pela Loja e pelo saldo do topo do Hub. Cada abertura começa do zero (pacote do meio
 * escolhido, sem o erro da vez anterior): o conteúdo ganha uma chave nova sempre que abre, e a
 * mesma chave ao fechar, para a animação de saída continuar.
 */
export function BuyCoinsModal({ open, onClose }: BuyCoinsModalProps) {
  const [opening, setOpening] = useState({ open, count: 0 })
  if (opening.open !== open) setOpening({ open, count: open ? opening.count + 1 : opening.count })
  return <BuyCoinsDialog key={opening.count} open={open} onClose={onClose} />
}

/** Mesmo molde para o pacote e para o cartão de espera, para o modal não mudar de tamanho */
const CARD =
  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 short:gap-0.5 short:py-2'

function BuyCoinsDialog({ open, onClose }: BuyCoinsModalProps) {
  /** null enquanto os pacotes não chegam */
  const [packages, setPackages] = useState<CoinPackage[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)
  const [buyFailed, setBuyFailed] = useState(false)

  const buyCoins = useProfileStore((s) => s.buyCoins)
  const loadProfile = useProfileStore((s) => s.loadProfile)

  // Busca os pacotes ao abrir (e a cada "Tentar de novo"); o do meio já vem escolhido, como no esboço
  useEffect(() => {
    if (!open) return
    let cancelled = false
    getCoinPackages()
      .then((pkgs) => {
        if (cancelled) return
        setPackages(pkgs)
        setSelectedId(pkgs[Math.floor(pkgs.length / 2)]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, attempt])

  const loading = packages === null && !loadFailed
  const unavailable = loadFailed || packages?.length === 0
  const selected = packages?.find((p) => p.id === selectedId) ?? null

  const retry = () => {
    setLoadFailed(false)
    setAttempt((n) => n + 1)
  }

  async function handleBuy() {
    if (!selected || buying) return
    setBuying(true)
    setBuyFailed(false)
    try {
      await buyCoins(selected.id)
      showToast({ tone: 'coin', message: COINS_TEXTS.received(selected.coins) })
      onClose()
    } catch {
      // O crédito pode ter acontecido mesmo com a resposta perdida: busca o saldo confirmado
      // (o loadProfile não lança erro; se falhar, o saldo antigo continua)
      await loadProfile()
      setBuyFailed(true)
    } finally {
      setBuying(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={buying ? undefined : onClose}
      dismissible={!buying}
      title={COINS_TEXTS.title}
      size="md"
      actions={
        !unavailable && (
          // Centralizado sob os pacotes, com largura própria (o mx-auto vence o justify-end do rodapé)
          <Button className="mx-auto min-w-64" disabled={!selected || buying} onClick={handleBuy}>
            {buying
              ? COINS_TEXTS.buying
              : selected
                ? COINS_TEXTS.receive(selected.coins)
                : COINS_TEXTS.loading}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3 short:gap-2">
        {unavailable ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <p role="alert" className="text-sm text-danger">
              {COINS_TEXTS.loadError}
            </p>
            <Button size="sm" variant="secondary" onClick={retry}>
              {COINS_TEXTS.retry}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 short:gap-1.5" aria-busy={loading}>
            {loading ? (
              <>
                <span role="status" className="sr-only">
                  {COINS_TEXTS.loading}
                </span>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    aria-hidden
                    className={`${CARD} border-line bg-bg-raised motion-safe:animate-pulse`}
                  >
                    <PackageContent pkg={null} />
                  </div>
                ))}
              </>
            ) : (
              packages?.map((pkg) => {
                const isSelected = pkg.id === selectedId
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    disabled={buying}
                    aria-pressed={isSelected}
                    aria-label={COINS_TEXTS.packageLabel(
                      pkg.coins,
                      COINS_TEXTS.price(pkg.priceInReais),
                    )}
                    onClick={() => setSelectedId(pkg.id)}
                    className={[
                      CARD,
                      'transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coin disabled:opacity-60',
                      isSelected
                        ? 'border-coin bg-coin/10 shadow-glow shadow-coin/20'
                        : 'border-line bg-bg-raised hover:border-coin/50',
                    ].join(' ')}
                  >
                    <PackageContent pkg={pkg} />
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Aviso fixo: compra simbólica, sem pagamento nem cartão [RN-LOJ-04] */}
        <p className="text-center text-xs text-text-muted short:text-[11px]">
          {COINS_TEXTS.notice}
        </p>
        {buyFailed && (
          <p role="alert" className="text-center text-sm text-danger">
            {COINS_TEXTS.buyError}
          </p>
        )}
      </div>
    </Modal>
  )
}

/**
 * Moeda, quantidade, "Coins" e o preço simbólico; sem `pkg`, ocupa o mesmo espaço sem mostrar
 * nada (cartão de espera)
 */
function PackageContent({ pkg }: { pkg: CoinPackage | null }) {
  const hidden = pkg === null ? 'invisible' : ''
  return (
    <>
      <span aria-hidden className={`text-lg leading-none text-coin short:text-base ${hidden}`}>
        ●
      </span>
      <span
        className={`font-display text-2xl leading-none font-bold text-coin short:text-xl ${hidden}`}
      >
        {(pkg?.coins ?? 0).toLocaleString('pt-BR')}
      </span>
      <span
        className={`font-display text-[11px] font-semibold tracking-wider text-text-muted uppercase ${hidden}`}
      >
        {COINS_TEXTS.coins}
      </span>
      <span
        className={`mt-1 rounded-full border border-line px-2 py-0.5 text-xs text-text-muted short:mt-0.5 ${hidden}`}
      >
        {COINS_TEXTS.price(pkg?.priceInReais ?? 0)}
      </span>
    </>
  )
}
