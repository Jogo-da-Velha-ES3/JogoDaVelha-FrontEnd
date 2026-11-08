// Comprar Coins (FE-32) [RN-LOJ-03] [RN-LOJ-04]: modal de pacotes simbólicos, sem pagamento real
// nem cartão, com crédito imediato. O saldo só muda depois da resposta da API (nada otimista):
// o modal nunca soma Coins por conta própria; o saldo novo vem do profileStore após a resposta,
// e o toast só aparece depois dela.
import { useEffect, useState } from 'react'
import { getCoinPackages, type CoinPackage } from '../../api/shop'
import { Button, Modal } from '../../components/ui'
import { COINS_TEXTS } from '../../constants/texts'
import { showToast } from '../../stores/toastStore'
import { useProfileStore } from '../../stores/profileStore'

export function BuyCoinsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [packages, setPackages] = useState<CoinPackage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buyCoins = useProfileStore((s) => s.buyCoins)
  const loadProfile = useProfileStore((s) => s.loadProfile)

  // Carrega os pacotes quando o modal abre; o do meio já vem selecionado, como no esboço
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void getCoinPackages()
      .then((pkgs) => {
        if (cancelled) return
        setError(null)
        setPackages(pkgs)
        setSelectedId(pkgs[Math.floor(pkgs.length / 2)]?.id ?? pkgs[0]?.id ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setError(COINS_TEXTS.loadError)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const selectedPackage = packages.find((p) => p.id === selectedId) ?? null
  // "Carregando" só antes do primeiro pacote chegar e sem erro (derivado, sem setState no effect)
  const loading = packages.length === 0 && error === null

  async function handleBuy() {
    if (!selectedPackage || buying) return
    setBuying(true)
    setError(null)
    try {
      await buyCoins(selectedPackage.id)
      showToast({ tone: 'coin', message: COINS_TEXTS.received(selectedPackage.coins) })
      onClose()
    } catch {
      // O crédito pode ter ocorrido no servidor; recarrega o perfil para sincronizar o saldo real
      try {
        await loadProfile()
      } catch {
        // Ignora em silêncio: o saldo antigo continua; a próxima carga do Hub corrige
      }
      setError(COINS_TEXTS.buyError)
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
      size="sm"
      actions={
        selectedPackage && (
          <Button disabled={buying} onClick={handleBuy}>
            {buying ? COINS_TEXTS.buying : COINS_TEXTS.receive(selectedPackage.coins)}
          </Button>
        )
      }
    >
      {loading ? (
        <p className="text-center text-sm text-text-muted" role="status">
          {COINS_TEXTS.loading}
        </p>
      ) : packages.length === 0 ? (
        <p className="text-center text-sm text-danger" role="alert">
          {error ?? COINS_TEXTS.loadError}
        </p>
      ) : (
        <div className="flex flex-col gap-3 short:gap-2">
          {/* Pacotes lado a lado, como no esboço: moeda + valor; o selecionado com borda dourada */}
          <div className="flex gap-2 short:gap-1.5">
            {packages.map((pkg) => {
              const selected = pkg.id === selectedId
              return (
                <button
                  key={pkg.id}
                  type="button"
                  disabled={buying}
                  aria-pressed={selected}
                  aria-label={`Pacote de ${pkg.coins.toLocaleString('pt-BR')} Coins`}
                  onClick={() => setSelectedId(pkg.id)}
                  className={[
                    'flex flex-1 flex-col items-center gap-1 rounded-xl border-2 p-2 transition short:p-1.5 short:gap-0.5',
                    selected
                      ? 'border-coin bg-coin/10 shadow-glow shadow-coin/20'
                      : 'border-line hover:border-primary/60',
                    buying ? 'cursor-default opacity-60' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span aria-hidden className="text-coin text-base short:text-sm">
                    ●
                  </span>
                  <span className="font-display text-lg font-bold text-coin short:text-base">
                    {pkg.coins.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-text-muted">Coins</span>
                </button>
              )
            })}
          </div>
          {/* Aviso fixo: compra simbólica, sem pagamento nem cartão [RN-LOJ-04] */}
          <p className="text-center text-xs text-text-muted short:text-[11px]">
            {COINS_TEXTS.aviso}
          </p>
          {error && (
            <p role="alert" className="text-center text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
