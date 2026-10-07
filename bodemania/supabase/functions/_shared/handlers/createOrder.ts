import { addBusinessDays, round2 } from '../money.ts'
import { buildPaymentBody, paymentView, rejectionMessage, type MpPayment } from '../mercadopago.ts'
import { INFILLS, MATERIALS, QUALITIES, FILAMENT_COLORS, isMaterial, isQuality, parseSTL, printLeadDays, printPackageCm, printShippingWeightKg, quotePrint } from '../print3d.ts'
import { selectionError, unitPriceOf } from '../pricing.ts'
import type { PackageLine } from '../shippingRules.ts'
import { computeTotals } from '../totals.ts'
import * as T from '../emailTemplates.ts'
import type { CatalogProduct, CouponInfo, PaymentMethod, ShippingId, ShippingOption } from '../types.ts'
import { isCPF, isEmail, isFullName, isPhone } from '../validate.ts'
import { AppError, ok, type Deps, type HandlerResult } from './ports.ts'
import { notifyStatus, safeSend, toMailOrder } from './orderMail.ts'
import { DIGITAL_SHIPPING, quoteShippingOptions } from './shipping.ts'

/** Produto que representa "impressão 3D sob medida" no catálogo. */
export const PRINT_PRODUCT_ID = 's01'

export interface PrintInput {
  filePath?: string
  fileName?: string
  manual?: { x: number; y: number; z: number; fill: number }
  scale: number
  material: string
  quality: string
  infill: number
  color: string
}
export interface OrderLineInput {
  productId: string
  qty: number
  options: Record<string, string>
  personalization?: string
  photoPath?: string
  print?: PrintInput
}
export interface CreateOrderInput {
  idempotencyKey: string
  lines: OrderLineInput[]
  addressId?: string
  shippingId: ShippingId
  coupon?: string
  notes?: string
  /** total que o cliente viu na tela; se o servidor calcular outro valor, o pedido NÃO é criado */
  expectedTotal?: number
  payment: {
    method: PaymentMethod
    card?: { token: string; installments: number; paymentMethodId: string; issuerId?: string }
    deviceId?: string
  }
}

// ───────── validação de entrada (sem dependências) ─────────

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const bad = (msg: string): never => {
  throw new AppError('bad_request', msg)
}

export function parseCreateOrder(body: unknown): CreateOrderInput {
  if (!isObj(body)) return bad('Pedido inválido.')
  const key = str(body.idempotencyKey, 80)
  if (!key || key.length < 8) bad('Chave do pedido ausente.')
  if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length > 30) bad('Carrinho vazio ou grande demais.')
  const lines: OrderLineInput[] = body.lines.map((l: unknown) => {
    if (!isObj(l)) return bad('Item inválido.')
    const qty = Math.floor(Number(l.qty))
    if (!str(l.productId, 40) || !(qty >= 1 && qty <= 99)) bad('Item inválido.')
    const options: Record<string, string> = {}
    if (isObj(l.options)) for (const [k, v] of Object.entries(l.options)) if (typeof v === 'string') options[k.slice(0, 40)] = v.slice(0, 40)
    const line: OrderLineInput = { productId: l.productId, qty, options, personalization: str(l.personalization, 600), photoPath: str(l.photoPath, 200) }
    if (l.print !== undefined) {
      const p = l.print
      if (!isObj(p)) bad('Impressão inválida.')
      line.print = {
        filePath: str(p.filePath, 200),
        fileName: str(p.fileName, 120),
        manual: isObj(p.manual) ? { x: Number(p.manual.x), y: Number(p.manual.y), z: Number(p.manual.z), fill: Number(p.manual.fill) } : undefined,
        scale: Number(p.scale),
        material: String(p.material),
        quality: String(p.quality),
        infill: Number(p.infill),
        color: String(p.color),
      }
    }
    return line
  })
  const pay = isObj(body.payment) ? body.payment : bad('Pagamento ausente.')
  const method = pay.method as PaymentMethod
  if (!['pix', 'card', 'boleto'].includes(method)) bad('Forma de pagamento inválida.')
  let card: CreateOrderInput['payment']['card']
  if (method === 'card') {
    const c = pay.card
    if (!isObj(c) || !str(c.token, 200) || !str(c.paymentMethodId, 40)) bad('Dados do cartão ausentes.')
    const installments = Math.floor(Number(c.installments))
    if (!(installments >= 1 && installments <= 12)) bad('Parcelas inválidas.')
    card = { token: c.token, installments, paymentMethodId: c.paymentMethodId, issuerId: str(c.issuerId, 40) }
  }
  if (!['pac', 'sedex', 'pickup', 'digital'].includes(body.shippingId)) bad('Forma de entrega inválida.')
  return {
    idempotencyKey: key!,
    lines,
    addressId: str(body.addressId, 60),
    shippingId: body.shippingId,
    coupon: str(body.coupon, 40)?.trim().toUpperCase() || undefined,
    notes: str(body.notes, 300)?.trim() || undefined,
    expectedTotal: Number.isFinite(Number(body.expectedTotal)) && body.expectedTotal !== null ? Number(body.expectedTotal) : undefined,
    payment: { method, card, deviceId: str(pay.deviceId, 120) },
  }
}

// ───────── impressão 3D sob medida: o preço é recalculado aqui, a partir do arquivo ─────────

const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

async function priceCustomPrint(deps: Deps, userId: string, line: OrderLineInput) {
  const p = line.print!
  if (!isMaterial(p.material) || !isQuality(p.quality)) throw new AppError('bad_request', 'Material ou qualidade inválidos.')
  const infill = (INFILLS as readonly number[]).includes(p.infill) ? p.infill : 25
  const scale = Math.round(clamp(Number.isFinite(p.scale) ? p.scale : 100, 10, 300))
  const color = FILAMENT_COLORS.find((c) => c.id === p.color) ?? FILAMENT_COLORS[0]

  let volumeCm3: number
  let size: [number, number, number]
  let origin: 'arquivo' | 'estimativa'
  if (p.filePath) {
    // o arquivo precisa estar na pasta do próprio cliente
    if (!p.filePath.startsWith(`${userId}/`) || p.filePath.includes('..')) throw new AppError('bad_request', 'Arquivo inválido.')
    let buf: ArrayBuffer
    try {
      buf = await deps.storage.download(p.filePath)
    } catch {
      throw new AppError('file_missing', 'Não encontramos o arquivo enviado. Envie o STL novamente.')
    }
    try {
      const mesh = parseSTL(buf)
      volumeCm3 = mesh.volumeCm3
      size = mesh.size
    } catch {
      throw new AppError('file_invalid', 'Não conseguimos ler o arquivo STL. Confira o arquivo e envie de novo.')
    }
    origin = 'arquivo'
  } else if (p.manual && [p.manual.x, p.manual.y, p.manual.z, p.manual.fill].every(Number.isFinite)) {
    const m = p.manual
    size = [clamp(m.x, 1, 1000), clamp(m.y, 1, 1000), clamp(m.z, 1, 1000)]
    volumeCm3 = (size[0] * size[1] * size[2] * clamp(m.fill, 0.1, 1)) / 1000
    origin = 'estimativa'
  } else {
    throw new AppError('bad_request', 'Envie o arquivo STL ou informe as medidas.')
  }

  const q = quotePrint({ volumeCm3, size, scale, material: p.material, quality: p.quality, infill, qty: line.qty })
  if (!q.fits) throw new AppError('print_too_large', 'A peça é maior que a nossa área de impressão. Reduza a escala ou fale com a gente.')
  const mat = MATERIALS.find((m) => m.id === p.material)!
  const qual = QUALITIES.find((x) => x.id === p.quality)!
  const scaled = size.map((d) => Math.round((d * scale) / 100))
  return {
    unit: q.unit,
    weight: printShippingWeightKg(q.grams),
    leadDays: printLeadDays(q.hours, line.qty),
    pkg: printPackageCm(size, scale),
    name: p.fileName ? `Impressão 3D — ${p.fileName.replace(/[^\w.\- ]/g, '').slice(0, 60)}` : `Impressão 3D sob medida (${scaled.join('×')} mm)`,
    variant: [`${mat.name} ${color.name}`, `${qual.name} (${qual.layer})`, p.material === 'resina' ? 'Resina' : `Preenchimento ${infill}%`, `${scaled.join(' × ')} mm`, `≈ ${Math.round(q.grams)} g`],
    meta: { origin, filePath: p.filePath ?? null, scale, material: p.material, quality: p.quality, infill, color: color.id, grams: Math.round(q.grams), hours: Math.round(q.hours * 10) / 10, size: scaled, volumeCm3: Math.round(volumeCm3 * 10) / 10 },
    colorHex: color.hex,
  }
}

// ───────── handler ─────────

interface PricedLine {
  product: CatalogProduct
  name: string
  unit: number
  qty: number
  variant: string[]
  personalization?: string
  photoPath?: string
  print?: Record<string, unknown>
  weight: number
  leadDays: number
  pkg: { lengthCm: number; widthCm: number; heightCm: number }
  color?: string
  physical: boolean
}

const EXPIRY_MS: Record<PaymentMethod, number> = { pix: 30 * 60_000, card: 2 * 86_400_000, boleto: 4 * 86_400_000 }

function stockMessage(productId: string, products: CatalogProduct[]) {
  const name = products.find((p) => p.id === productId)?.name ?? 'um dos itens'
  return `Estoque insuficiente para “${name}”. Ajuste a quantidade no carrinho.`
}

export async function handleCreateOrder(deps: Deps, userId: string, input: CreateOrderInput): Promise<HandlerResult> {
  // 0) repetição do mesmo envio (duplo clique, rede lenta) devolve o pedido já criado
  const existing = await deps.repo.findOrderByIdem(userId, input.idempotencyKey)
  if (existing) return ok(orderResponse(existing))

  if (!deps.config.paymentsEnabled) throw new AppError('payments_not_configured', 'Os pagamentos ainda não foram ativados nesta loja.', 503)

  // 1) cliente
  const profile = await deps.repo.getProfile(userId)
  if (!profile) throw new AppError('unauthorized', 'Entre na sua conta para comprar.', 401)
  if (!isFullName(profile.name) || !isCPF(profile.cpf) || !isPhone(profile.phone) || !isEmail(profile.email)) {
    throw new AppError('profile_incomplete', 'Complete seu nome, CPF e celular para emitir a nota fiscal.')
  }

  // 2) itens, sempre com preço do banco
  const products = await deps.repo.getProducts([...new Set(input.lines.map((l) => l.productId))])
  const byId = new Map(products.map((p) => [p.id, p]))
  const priced: PricedLine[] = []
  for (const l of input.lines) {
    const p = byId.get(l.productId)
    if (!p || !p.active) throw new AppError('product_unavailable', 'Um dos produtos do carrinho não está mais disponível. Atualize o carrinho.')
    if (l.photoPath && (!l.photoPath.startsWith(`${userId}/`) || l.photoPath.includes('..'))) throw new AppError('bad_request', 'Foto inválida.')

    if (l.print) {
      if (p.id !== PRINT_PRODUCT_ID) throw new AppError('bad_request', 'Item inválido.')
      const c = await priceCustomPrint(deps, userId, l)
      priced.push({ product: p, name: c.name, unit: c.unit, qty: l.qty, variant: c.variant, personalization: l.personalization, print: c.meta, weight: c.weight, leadDays: c.leadDays, pkg: c.pkg, color: c.colorHex, physical: true })
      continue
    }
    if (p.id === PRINT_PRODUCT_ID) throw new AppError('bad_request', 'Faça o orçamento da impressão 3D para continuar.')
    const err = selectionError(p, l.options, l.personalization, !!l.photoPath)
    if (err) throw new AppError('bad_selection', err)
    const artOpt = p.options.find((o) => o.affectsArt)
    priced.push({
      product: p,
      name: p.name,
      unit: unitPriceOf(p, l.options, l.personalization),
      qty: l.qty,
      variant: p.options.map((o) => `${o.label}: ${o.values.find((v) => v.id === l.options[o.id])?.label ?? '—'}`),
      personalization: l.personalization?.trim() || undefined,
      photoPath: l.photoPath,
      weight: p.weight,
      leadDays: p.leadDays,
      pkg: { lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm },
      color: artOpt?.values.find((v) => v.id === l.options[artOpt.id])?.hex ?? p.tone ?? undefined,
      physical: p.kind === 'physical',
    })
  }
  const subtotal = round2(priced.reduce((s, l) => s + l.unit * l.qty, 0))

  // 3) cupom (validado no banco)
  let coupon: CouponInfo | null = null
  if (input.coupon) {
    const c = await deps.repo.checkCoupon(input.coupon, subtotal)
    if (!c.ok) throw new AppError('coupon_invalid', c.error)
    coupon = c.coupon
  }

  // 4) entrega
  const digitalOnly = priced.every((l) => !l.physical)
  let address = null
  let shipOption: ShippingOption
  const goodsBeforeShipping = computeTotals({ subtotal, coupon, shipping: 0, pix: false, pixRate: 0 }).goods
  if (digitalOnly) {
    shipOption = DIGITAL_SHIPPING
  } else {
    if (!input.addressId) throw new AppError('address_required', 'Escolha o endereço de entrega.')
    address = await deps.repo.getAddress(userId, input.addressId)
    if (!address) throw new AppError('address_required', 'Endereço não encontrado.')
    const lines: PackageLine[] = priced
      .filter((l) => l.physical)
      .map((l, i) => ({ id: `${l.product.id}-${i}`, qty: l.qty, weight: l.weight, lengthCm: l.pkg.lengthCm, widthCm: l.pkg.widthCm, heightCm: l.pkg.heightCm, unitPrice: l.unit }))
    const { options } = await quoteShippingOptions(deps, { destCep: address.cep, destUf: address.uf, lines, goods: goodsBeforeShipping, freeShippingCoupon: !!coupon?.freeShipping })
    const chosen = options.find((o) => o.id === input.shippingId)
    if (!chosen) throw new AppError('shipping_unavailable', 'A forma de entrega escolhida não está disponível para este CEP. Escolha outra.')
    shipOption = chosen
  }

  // 5) totais e prazos
  const method = input.payment.method
  const totals = computeTotals({ subtotal, coupon, shipping: shipOption.price, pix: method === 'pix', pixRate: deps.config.pixRate })
  if (input.expectedTotal !== undefined && Math.abs(input.expectedTotal - totals.total) > 0.01) {
    throw new AppError('total_changed', `O valor do pedido mudou para ${brl(totals.total)}. Confira o resumo e confirme de novo.`, 409, String(totals.total))
  }
  if (method === 'card') {
    const maxInst = Math.max(1, Math.min(deps.config.maxInstallments, Math.floor(totals.total / deps.config.minInstallment)))
    if (input.payment.card!.installments > maxInst) throw new AppError('bad_request', `Para este valor o máximo é ${maxInst}x.`)
  }
  const now = deps.now()
  const leadDays = Math.max(0, ...priced.map((l) => l.leadDays))
  const estimate = addBusinessDays(now, leadDays + shipOption.days + (method === 'boleto' ? 2 : 0))
  const expiresAt = new Date(now.getTime() + EXPIRY_MS[method])

  // 6) grava o pedido (baixa estoque e usa o cupom na mesma transação)
  let orderId: string
  try {
    orderId = await deps.repo.placeOrder(
      {
        user_id: userId,
        subtotal: totals.subtotal,
        discount: totals.discount,
        pix_discount: totals.pixDiscount,
        shipping: totals.shipping,
        total: totals.total,
        coupon: coupon?.code ?? null,
        payment: { method, idem: input.idempotencyKey, installments: input.payment.card?.installments },
        customer: { name: profile.name, email: profile.email, cpf: profile.cpf, phone: profile.phone },
        address: address ? { recipient: address.recipient, label: address.label, cep: address.cep, street: address.street, number: address.number, complement: address.complement, district: address.district, city: address.city, uf: address.uf } : null,
        shipping_option: shipOption,
        lead_days: leadDays,
        estimate: estimate.toISOString(),
        notes: input.notes ?? null,
        digital_only: digitalOnly,
        expires_at: expiresAt.toISOString(),
      },
      priced.map((l) => ({
        product_id: l.product.id,
        name: l.name,
        unit_price: l.unit,
        qty: l.qty,
        variant: l.variant,
        personalization: l.personalization ?? null,
        photo_path: l.photoPath ?? null,
        print: l.print ?? null,
        art: l.product.art,
        color: l.color ?? null,
        universe: l.product.universe,
        kind: l.physical ? 'physical' : l.product.kind,
      })),
    )
  } catch (e) {
    if (e instanceof AppError) {
      if (e.code === 'out_of_stock') throw new AppError('out_of_stock', stockMessage(e.detail ?? '', products), 409)
      if (e.code === 'product_unavailable') throw new AppError('product_unavailable', 'Um dos produtos do carrinho não está mais disponível. Atualize o carrinho.', 409)
      if (e.code === 'coupon_unavailable') throw new AppError('coupon_invalid', 'Este cupom acabou de esgotar. Remova o cupom e tente de novo.', 409)
    }
    throw e
  }

  // 7) cobra no Mercado Pago
  const body = buildPaymentBody({
    orderId,
    total: totals.total,
    method,
    customer: profile,
    address,
    card: input.payment.card,
    notificationUrl: deps.config.notificationUrl,
    expiresAt,
    items: priced.map((l) => ({ id: l.product.id, title: l.name, qty: l.qty, unitPrice: l.unit })),
  })
  let payment: MpPayment
  try {
    payment = await deps.mp.createPayment(body, `${orderId}-${input.idempotencyKey}`, input.payment.deviceId)
  } catch (e) {
    deps.log('mp_create_failed', { orderId, error: String(e) })
    await deps.repo.cancelOrder(orderId, 'Não foi possível iniciar o pagamento.')
    throw new AppError('payment_unavailable', 'Não conseguimos iniciar o pagamento agora. Tente novamente em instantes ou escolha outra forma de pagar.', 502)
  }

  // 8) resultado
  const view = paymentView(method, payment)
  await deps.repo.patchPayment(orderId, { ...view, installments: input.payment.card?.installments, idem: input.idempotencyKey }, payment.status === 'in_process' ? new Date(now.getTime() + EXPIRY_MS.card) : undefined)

  if (method === 'card') {
    if (payment.status === 'approved') {
      await deps.repo.applyPayment(orderId, 'approved', String(payment.id), payment.transaction_amount ?? null, payment.status_detail ?? null)
    } else if (payment.status === 'rejected') {
      await deps.repo.applyPayment(orderId, 'rejected', String(payment.id), null, payment.status_detail ?? null)
      throw new AppError('card_rejected', rejectionMessage(payment.status_detail), 402)
    }
    // in_process / pending: o webhook confirma depois
  }

  const order = await deps.repo.getOrder(orderId)
  if (!order) throw new AppError('internal', 'Pedido criado, mas não foi possível carregá-lo. Veja em “Meus pedidos”.', 500)
  const mailOrder = toMailOrder(order)
  await safeSend(deps, order.customer.email, T.orderReceived(deps.config.siteUrl, mailOrder))
  if (order.status === 'pago') await notifyStatus(deps, order, 'pago')
  return ok(orderResponse(order), 201)
}

function orderResponse(o: { id: string; status: string; payment: Record<string, any>; total: number }) {
  return {
    orderId: o.id,
    status: o.status,
    total: o.total,
    payment: { method: o.payment.method, pixCode: o.payment.pixCode, ticketUrl: o.payment.ticketUrl, boletoLine: o.payment.boletoLine, boletoUrl: o.payment.boletoUrl },
  }
}

