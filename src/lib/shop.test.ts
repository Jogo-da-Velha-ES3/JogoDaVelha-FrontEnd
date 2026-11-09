import { describe, expect, it } from 'vitest'
import { knownItems, shopItemState } from './shop'

describe('shopItemState (FE-31)', () => {
  it('item do jogador é "Seu", com qualquer saldo', () => {
    expect(shopItemState({ owned: true, priceCoins: 700 }, 0)).toEqual({ kind: 'OWNED' })
  })

  it('saldo igual ou maior que o preço: à venda', () => {
    expect(shopItemState({ owned: false, priceCoins: 350 }, 350)).toEqual({ kind: 'FOR_SALE' })
    expect(shopItemState({ owned: false, priceCoins: 350 }, 1000)).toEqual({ kind: 'FOR_SALE' })
  })

  it('saldo menor: diz quanto falta', () => {
    expect(shopItemState({ owned: false, priceCoins: 500 }, 340)).toEqual({
      kind: 'MISSING',
      missing: 160,
    })
  })

  it('saldo ainda não carregado: falta o preço todo, sem liberar a compra', () => {
    expect(shopItemState({ owned: false, priceCoins: 400 }, null)).toEqual({
      kind: 'MISSING',
      missing: 400,
    })
  })
})

describe('knownItems', () => {
  it('segue a ordem do front e ignora códigos que o front não conhece', () => {
    const items = [{ code: 'O' }, { code: 'AVATAR_NOVO' }, { code: 'X' }]
    expect(knownItems(items, ['X', 'O', 'TRIANGULO'] as const)).toEqual([
      { code: 'X' },
      { code: 'O' },
    ])
  })
})
