import { onlyDigits } from '../money.ts'
import { couponDiscount } from '../totals.ts'
import { DIGITAL_SHIPPING, buildShippingOptions, heuristicQuote, ufFromCep, type PackageLine } from '../shippingRules.ts'
import type { ShippingOption } from '../types.ts'
import { AppError, ok, type Deps, type HandlerResult } from './ports.ts'

/** Cota o frete: Correios via Melhor Envio; se falhar, usa a tabela de contingência (nunca deixa o cliente sem opção). */
export async function quoteShippingOptions(
  deps: Deps,
  input: { destCep: string; destUf?: string; lines: PackageLine[]; goods: number; freeShippingCoupon: boolean },
): Promise<{ options: ShippingOption[]; source: 'melhor-envio' | 'tabela' }> {
  const destUf = input.destUf || ufFromCep(input.destCep)
  if (!destUf) throw new AppError('invalid_cep', 'CEP não encontrado. Confira os números.')
  const weight = input.lines.reduce((s, l) => s + l.weight * l.qty, 0)

  let raw: Awaited<ReturnType<typeof deps.shipping.quote>> = []
  let source: 'melhor-envio' | 'tabela' = 'melhor-envio'
  try {
    raw = await deps.shipping.quote({ originCep: deps.config.originCep, destCep: input.destCep, lines: input.lines })
  } catch (e) {
    deps.log('shipping_quote_failed', { error: String(e) })
  }
  if (!raw.length) {
    raw = heuristicQuote(deps.config.originCep, destUf, weight)
    source = 'tabela'
  }
  const options = buildShippingOptions(raw, {
    originCep: deps.config.originCep,
    destUf,
    goods: input.goods,
    freeShippingFrom: deps.config.freeShippingFrom,
    freeShippingCoupon: input.freeShippingCoupon,
  })
  return { options, source }
}

export { DIGITAL_SHIPPING }

// ───────── Edge Function: shipping-quote ─────────

export interface ShippingQuoteInput {
  cep: string
  coupon?: string
  items: { productId: string; qty: number; /** peso/medidas só para estimativa de impressão 3D sob medida */ custom?: { weight: number; lengthCm: number; widthCm: number; heightCm: number; unitPrice: number } }[]
}

export async function handleShippingQuote(deps: Deps, input: ShippingQuoteInput): Promise<HandlerResult> {
  const cep = onlyDigits(input.cep ?? '')
  if (!/^\d{8}$/.test(cep)) throw new AppError('invalid_cep', 'Digite um CEP com 8 números.')
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 30) throw new AppError('bad_request', 'Carrinho inválido.')

  const ids = [...new Set(input.items.map((i) => i.productId))]
  const products = await deps.repo.getProducts(ids)
  const byId = new Map(products.map((p) => [p.id, p]))

  const lines: PackageLine[] = []
  let subtotal = 0
  for (const it of input.items) {
    const p = byId.get(it.productId)
    const qty = Math.min(99, Math.max(1, Math.floor(Number(it.qty) || 1)))
    if (!p) continue
    if (it.custom) {
      const c = it.custom
      lines.push({ id: p.id, qty, weight: clamp(c.weight, 0.05, 30), lengthCm: clamp(c.lengthCm, 4, 100), widthCm: clamp(c.widthCm, 4, 100), heightCm: clamp(c.heightCm, 2, 100), unitPrice: clamp(c.unitPrice, 0, 20000) })
      subtotal += clamp(c.unitPrice, 0, 20000) * qty
    } else if (p.kind === 'physical') {
      lines.push({ id: p.id, qty, weight: p.weight, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm, unitPrice: p.price })
      subtotal += p.price * qty
    } else {
      subtotal += p.price * qty
    }
  }
  if (!lines.length) return ok({ options: [DIGITAL_SHIPPING], source: 'digital' })

  let freeCoupon = false
  let goods = subtotal
  if (input.coupon) {
    const c = await deps.repo.checkCoupon(input.coupon, subtotal)
    if (c.ok) {
      freeCoupon = !!c.coupon.freeShipping
      goods = subtotal - couponDiscount(c.coupon, subtotal)
    }
  }
  const { options, source } = await quoteShippingOptions(deps, { destCep: cep, lines, goods, freeShippingCoupon: freeCoupon })
  return ok({ options, source })
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number(n) || min))
