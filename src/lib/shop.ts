// Regras de exibição da Loja (FE-31) [RF-LOJ-02] [RN-LOJ-03]. Funções puras: só dizem como mostrar
// um item com o saldo que o servidor confirmou. Quem decide se a compra vale é o servidor.

/** O mínimo de um item da Loja para decidir o estado dele */
export interface ShopItemLike {
  owned: boolean
  priceCoins: number
}

export type ShopItemState =
  /** Já é do jogador */
  | { kind: 'OWNED' }
  /** Dá para comprar com o saldo atual */
  | { kind: 'FOR_SALE' }
  /** Saldo não basta: quanto falta. Saldo ainda não carregado também cai aqui, com o preço todo */
  | { kind: 'MISSING'; missing: number }

/** Estado do card: Seu, À venda ou Sem saldo ("Faltam N Coins") */
export function shopItemState(item: ShopItemLike, balance: number | null): ShopItemState {
  if (item.owned) return { kind: 'OWNED' }
  const available = balance ?? 0
  if (available >= item.priceCoins) return { kind: 'FOR_SALE' }
  return { kind: 'MISSING', missing: item.priceCoins - available }
}

/** Itens do catálogo cujo `code` o front conhece, na ordem do front (ex: CHARACTERS, ABILITIES) */
export function knownItems<T extends { code: string }, C extends string>(
  items: readonly T[],
  order: readonly C[],
): (T & { code: C })[] {
  return order.flatMap((code) => {
    const item = items.find((candidate) => candidate.code === code)
    return item ? [{ ...item, code }] : []
  })
}
