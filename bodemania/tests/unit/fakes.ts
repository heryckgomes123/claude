import type { Mail } from '../../supabase/functions/_shared/emailTemplates.ts'
import type { MpPayment } from '../../supabase/functions/_shared/mercadopago.ts'
import { AppError, type AddressRow, type Deps, type OrderRow, type ProfileRow, type Repo } from '../../supabase/functions/_shared/handlers/ports.ts'
import type { CatalogProduct, CouponInfo } from '../../supabase/functions/_shared/types.ts'

export const product = (id: string, over: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id, slug: id, name: `Produto ${id}`, price: 100, kind: 'physical', weight: 0.5, leadDays: 3, stock: 10, active: true,
  options: [], personalization: null, photoUpload: null, art: 'avental', tone: null, universe: 'maconaria',
  widthCm: 20, heightCm: 5, lengthCm: 30, ...over,
})

export const aventalComRito = product('avental', {
  price: 200,
  options: [{ id: 'rito', label: 'Rito', type: 'chips', values: [{ id: 'reaa', label: 'REAA' }, { id: 'york', label: 'York', priceDelta: 20 }] }],
  personalization: { label: 'Iniciais', placeholder: '', maxLength: 6, price: 25 },
})

export class FakeRepo implements Repo {
  profiles = new Map<string, ProfileRow>()
  addresses = new Map<string, AddressRow & { user_id: string }>()
  products = new Map<string, CatalogProduct>()
  coupons = new Map<string, CouponInfo & { uses?: number; max?: number }>()
  orders = new Map<string, OrderRow>()
  seq = 10420
  events: string[] = []

  async getProfile(id: string) { return this.profiles.get(id) ?? null }
  async getAddress(userId: string, id: string) {
    const a = this.addresses.get(id)
    return a && a.user_id === userId ? a : null
  }
  async getProducts(ids: string[]) { return ids.map((i) => this.products.get(i)).filter(Boolean) as CatalogProduct[] }
  async checkCoupon(code: string, subtotal: number) {
    const c = this.coupons.get(code.toUpperCase())
    if (!c) return { ok: false as const, error: 'Cupom inválido ou expirado.' }
    if (c.min && subtotal < c.min) return { ok: false as const, error: `Válido para pedidos a partir de R$ ${c.min}.` }
    return { ok: true as const, coupon: c }
  }
  async placeOrder(order: Record<string, any>, items: Record<string, any>[]) {
    for (const it of items) {
      const p = this.products.get(it.product_id)
      if (!p || !p.active) throw new AppError('product_unavailable', 'x', 409, it.product_id)
      if (p.stock !== null && p.stock < it.qty) throw new AppError('out_of_stock', 'x', 409, p.id)
    }
    for (const it of items) { const p = this.products.get(it.product_id)!; if (p.stock !== null) p.stock -= it.qty }
    const id = `BM-${this.seq++}`
    this.orders.set(id, {
      id, user_id: order.user_id, status: 'aguardando', subtotal: order.subtotal, discount: order.discount, pix_discount: order.pix_discount,
      shipping: order.shipping, total: order.total, coupon: order.coupon, payment: order.payment, customer: order.customer, address: order.address,
      shipping_option: order.shipping_option, lead_days: order.lead_days, estimate: order.estimate, tracking: null, notes: order.notes, digital_only: order.digital_only,
      items: items.map((i) => ({ product_id: i.product_id, name: i.name, unit_price: i.unit_price, qty: i.qty, variant: i.variant, personalization: i.personalization })),
    })
    return id
  }
  async findOrderByIdem(userId: string, key: string) {
    return [...this.orders.values()].find((o) => o.user_id === userId && o.payment.idem === key && o.status !== 'cancelado') ?? null
  }
  async patchPayment(orderId: string, patch: Record<string, unknown>) {
    const o = this.orders.get(orderId)!
    o.payment = { ...o.payment, ...patch }
  }
  private restock(o: OrderRow) { for (const i of o.items) { const p = this.products.get(i.product_id); if (p && p.stock !== null) p.stock += i.qty } }
  async cancelOrder(orderId: string, note: string) {
    const o = this.orders.get(orderId)!
    if (o.status === 'cancelado') return
    o.status = 'cancelado'; this.restock(o); this.events.push(`${orderId}:cancelado:${note}`)
  }
  async applyPayment(orderId: string, mpStatus: string, mpId: string, amount: number | null) {
    const o = this.orders.get(orderId)!
    o.payment = { ...o.payment, mpId, mpStatus }
    let changed = false, refundNeeded = false
    if (mpStatus === 'approved') {
      if (amount !== null && Math.abs(amount - o.total) > 0.01) throw new AppError('amount_mismatch', 'x', 409)
      if (o.status === 'aguardando') { o.status = 'pago'; changed = true }
      else if (o.status === 'cancelado') refundNeeded = true
    } else if (['cancelled', 'rejected', 'expired'].includes(mpStatus) && o.status === 'aguardando') {
      o.status = 'cancelado'; this.restock(o); changed = true
    }
    return { status: o.status, changed, refundNeeded }
  }
  async adminSetStatus(orderId: string, status: OrderRow['status'], _note: string | null, tracking: string | null) {
    const o = this.orders.get(orderId)!
    const flow = ['aguardando', 'pago', 'producao', 'enviado', 'entregue']
    if (o.status === status) return { status, changed: false }
    if (['entregue', 'cancelado'].includes(o.status)) throw new AppError('invalid_transition', 'x', 409)
    if (status !== 'cancelado' && flow.indexOf(status) <= flow.indexOf(o.status)) throw new AppError('invalid_transition', 'x', 409)
    if (status === 'cancelado') this.restock(o)
    o.status = status
    if (tracking) o.tracking = tracking
    return { status, changed: true }
  }
  async getOrder(id: string) { return this.orders.get(id) ?? null }
}

export interface Harness {
  deps: Deps
  repo: FakeRepo
  sent: { to: string; mail: Mail }[]
  mpCalls: { body: Record<string, any>; key: string; deviceId?: string }[]
  refunds: string[]
  logs: string[]
  files: Map<string, ArrayBuffer>
  setMp(fn: (body: Record<string, any>) => MpPayment | Promise<MpPayment>): void
  payments: Map<string, MpPayment>
  shippingQuotes: unknown[]
  failShipping: boolean
}

export const USER = '11111111-1111-1111-1111-111111111111'
export const OTHER = '22222222-2222-2222-2222-222222222222'

export function harness(startId = 9001): Harness {
  const repo = new FakeRepo()
  repo.profiles.set(USER, { id: USER, name: 'Ana Souza', email: 'ana@exemplo.com', cpf: '52998224725', phone: '11987654321', role: 'customer' })
  repo.profiles.set('admin-1', { id: 'admin-1', name: 'Dono Loja', email: 'dono@bodemania.com.br', cpf: '', phone: '', role: 'admin' })
  repo.addresses.set('addr-1', { id: 'addr-1', user_id: USER, label: 'Casa', recipient: 'Ana Souza', cep: '20040020', street: 'Av. Rio Branco', number: '50', complement: '', district: 'Centro', city: 'Rio de Janeiro', uf: 'RJ' })
  repo.addresses.set('addr-sp', { id: 'addr-sp', user_id: USER, label: 'Casa SP', recipient: 'Ana Souza', cep: '01310100', street: 'Av. Paulista', number: '1000', complement: '', district: 'Bela Vista', city: 'São Paulo', uf: 'SP' })
  repo.addresses.set('addr-other', { id: 'addr-other', user_id: OTHER, label: 'Casa', recipient: 'Outra', cep: '20040020', street: 'R', number: '1', complement: '', district: 'C', city: 'Rio', uf: 'RJ' })
  repo.products.set('avental', structuredClone(aventalComRito))
  repo.products.set('digital', product('digital', { kind: 'digital', price: 190, stock: null, weight: 0 }))
  repo.products.set('s01', product('s01', { name: 'Impressão 3D', kind: 'service', price: 29, stock: null, weight: 0, universe: '3d' }))
  repo.products.set('litho', product('litho', { price: 170, photoUpload: { label: 'Foto', required: true }, universe: '3d' }))

  const sent: Harness['sent'] = []
  const mpCalls: Harness['mpCalls'] = []
  const refunds: string[] = []
  const logs: string[] = []
  const files = new Map<string, ArrayBuffer>()
  const payments = new Map<string, MpPayment>()
  let pid = startId
  let mpImpl: (body: Record<string, any>) => MpPayment | Promise<MpPayment> = (b) => ({
    id: pid++, status: b.payment_method_id === 'pix' || b.payment_method_id === 'bolbradesco' ? 'pending' : 'approved',
    external_reference: b.external_reference, transaction_amount: b.transaction_amount,
    point_of_interaction: { transaction_data: { qr_code: '00020126PIXCODE', ticket_url: 'https://mp/ticket' } },
    transaction_details: { digitable_line: '34191.00000 00000.000000', external_resource_url: 'https://mp/boleto.pdf' },
  })
  const h: Harness = {
    repo, sent, mpCalls, refunds, logs, files, payments, shippingQuotes: [], failShipping: false,
    setMp: (fn) => { mpImpl = fn },
    deps: {
      repo,
      mp: {
        async createPayment(body, key, deviceId) { mpCalls.push({ body, key, deviceId }); const p = await mpImpl(body); payments.set(String(p.id), p); return p },
        async getPayment(id) { const p = payments.get(id); if (!p) throw new Error('not found'); return p },
        async refund(id) { refunds.push(id) },
      },
      shipping: {
        async quote(input) {
          h.shippingQuotes.push(input)
          if (h.failShipping) throw new Error('ME fora do ar')
          return [{ id: 'pac', price: 31.9, days: 6 }, { id: 'sedex', price: 58.4, days: 2 }]
        },
      },
      storage: { async download(path) { const f = files.get(path); if (!f) throw new Error('404'); return f } },
      mail: { async send(to, mail) { sent.push({ to, mail }) } },
      now: () => new Date('2026-10-07T15:00:00Z'),
      log: (e, d) => logs.push(`${e} ${JSON.stringify(d ?? {})}`),
      config: {
        siteUrl: 'https://bodemania.com.br', originCep: '01310100', freeShippingFrom: 299, pixRate: 0.05, maxInstallments: 6, minInstallment: 30,
        notificationUrl: 'https://x.supabase.co/functions/v1/mp-webhook', adminEmail: 'dono@bodemania.com.br', paymentsEnabled: true, mpWebhookSecret: 'segredo',
      },
    },
  }
  return h
}
