import { round2 } from './money.ts'
import type { CouponInfo, Totals } from './types.ts'

/** Desconto do cupom sobre o subtotal (nunca maior que o próprio subtotal). */
export function couponDiscount(c: CouponInfo | null | undefined, subtotal: number): number {
  if (!c) return 0
  if (c.min && subtotal < c.min) return 0
  const raw = c.percent ? subtotal * c.percent : (c.amount ?? 0)
  return round2(Math.min(Math.max(raw, 0), subtotal))
}

export function computeTotals(input: { subtotal: number; coupon: CouponInfo | null; shipping: number; pix: boolean; pixRate: number }): Totals {
  const subtotal = round2(input.subtotal)
  const discount = couponDiscount(input.coupon, subtotal)
  const goods = round2(subtotal - discount)
  const pixDiscount = input.pix ? round2(goods * input.pixRate) : 0
  const shipping = round2(input.shipping)
  return { subtotal, discount, goods, pixDiscount, shipping, total: round2(goods + shipping - pixDiscount) }
}
