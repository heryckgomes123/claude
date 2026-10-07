import { productById, useProducts } from '../data/catalog'
import { uid } from '../lib/format'
import { couponDiscount } from '../../supabase/functions/_shared/totals'
import { unitPriceOf } from '../../supabase/functions/_shared/pricing'
import { cartStore, type CartItem, type CouponInfo } from './stores'

export function unitPrice(item: CartItem) {
  if (item.custom) return item.custom.unitPrice
  const p = productById(item.productId)
  return p ? unitPriceOf(p, item.options, item.personalization) : 0
}

export function variantLabels(item: CartItem): string[] {
  if (item.custom) return item.custom.details
  const p = productById(item.productId)
  if (!p) return []
  return (p.options ?? []).map((opt) => `${opt.label}: ${opt.values.find((v) => v.id === item.options[opt.id])?.label ?? '—'}`)
}

export function itemColor(item: CartItem): string | undefined {
  if (item.custom) return item.custom.color
  const p = productById(item.productId)
  if (!p) return undefined
  const opt = p.options?.find((o) => o.affectsArt)
  return opt?.values.find((v) => v.id === item.options[opt.id])?.hex ?? p.tone
}

export function addToCart(input: Omit<CartItem, 'key'>) {
  const key = input.custom
    ? uid('c')
    : [input.productId, ...Object.entries(input.options).map(([k, v]) => `${k}=${v}`), input.personalization ?? '', input.photo ? uid() : ''].join('|')
  cartStore.set((s) => {
    const existing = s.items.find((i) => i.key === key)
    if (existing) return { items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, i.qty + input.qty) } : i)) }
    return { items: [...s.items, { ...input, key }] }
  })
  return key
}

export const setQty = (key: string, qty: number) =>
  cartStore.set((s) => ({ items: qty <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, qty) } : i)) }))

export const removeFromCart = (key: string) => cartStore.set((s) => ({ items: s.items.filter((i) => i.key !== key) }))

export const clearCart = () => cartStore.set({ items: [], coupon: '', couponInfo: null, couponError: '' })

export type CartTotals = {
  count: number
  subtotal: number
  discount: number
  couponLabel?: string
  couponError?: string
  freeShippingCoupon: boolean
  weight: number
  leadDays: number
  digitalOnly: boolean
}

export function cartTotals(items: CartItem[], coupon: CouponInfo | null, storedError = ''): CartTotals {
  let subtotal = 0
  let weight = 0
  let leadDays = 0
  let count = 0
  let digitalOnly = items.length > 0
  for (const i of items) {
    const p = productById(i.productId)
    subtotal += unitPrice(i) * i.qty
    count += i.qty
    weight += (i.custom?.weight ?? p?.weight ?? 0) * i.qty
    leadDays = Math.max(leadDays, i.custom?.leadDays ?? p?.leadDays ?? 0)
    if (i.custom || p?.kind === 'physical') digitalOnly = false
  }
  subtotal = Math.round(subtotal * 100) / 100
  let couponError = storedError || undefined
  if (coupon?.min && subtotal < coupon.min) couponError = `Válido para pedidos a partir de R$ ${coupon.min}.`
  const active = coupon && !couponError ? coupon : null
  return {
    count,
    subtotal,
    discount: couponDiscount(active, subtotal),
    couponLabel: active?.label,
    couponError,
    freeShippingCoupon: !!active?.freeShipping,
    weight,
    leadDays,
    digitalOnly,
  }
}

export function useCart() {
  const { items, coupon, couponInfo, couponError } = cartStore.use()
  useProducts() // preços e estoque podem chegar depois do carregamento do catálogo
  return { items, coupon, couponInfo, totals: cartTotals(items, couponInfo, couponError) }
}
