/** Interfaces (ports) que os handlers usam. A produção as implementa com Supabase/Mercado Pago/Resend; os testes com fakes. */
import type { MpPayment } from '../mercadopago.ts'
import type { Mail } from '../emailTemplates.ts'
import type { Address, CatalogProduct, CouponInfo, ShippingOption } from '../types.ts'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public detail?: string,
  ) {
    super(message)
  }
}

export interface ProfileRow {
  id: string
  name: string
  email: string
  cpf: string
  phone: string
  role: 'customer' | 'admin'
}
export type AddressRow = Address & { id: string; recipient: string; label: string }

export interface OrderItemRow {
  product_id: string
  name: string
  unit_price: number
  qty: number
  variant: string[]
  personalization: string | null
}
export interface OrderRow {
  id: string
  user_id: string | null
  status: 'aguardando' | 'pago' | 'producao' | 'enviado' | 'entregue' | 'cancelado'
  subtotal: number
  discount: number
  pix_discount: number
  shipping: number
  total: number
  coupon: string | null
  payment: Record<string, any>
  customer: { name: string; email: string; cpf: string; phone: string }
  address: (Address & { recipient?: string }) | null
  shipping_option: ShippingOption
  lead_days: number
  estimate: string | null
  tracking: string | null
  notes: string | null
  digital_only: boolean
  items: OrderItemRow[]
}

export interface Repo {
  getProfile(userId: string): Promise<ProfileRow | null>
  getAddress(userId: string, addressId: string): Promise<AddressRow | null>
  getProducts(ids: string[]): Promise<CatalogProduct[]>
  checkCoupon(code: string, subtotal: number): Promise<{ ok: true; coupon: CouponInfo } | { ok: false; error: string }>
  /** Chama a função place_order. Lança AppError('out_of_stock' | 'product_unavailable' | 'coupon_unavailable'). */
  placeOrder(order: Record<string, unknown>, items: Record<string, unknown>[]): Promise<string>
  /** Pedido não cancelado criado com a mesma chave (evita cobrança dupla). Após falha, o cliente usa chave nova. */
  findOrderByIdem(userId: string, key: string): Promise<OrderRow | null>
  patchPayment(orderId: string, patch: Record<string, unknown>, expiresAt?: Date | null): Promise<void>
  cancelOrder(orderId: string, note: string): Promise<void>
  applyPayment(orderId: string, mpStatus: string, mpId: string, amount: number | null, detail: string | null): Promise<{ status: OrderRow['status']; changed: boolean; refundNeeded: boolean }>
  adminSetStatus(orderId: string, status: OrderRow['status'], note: string | null, tracking: string | null, actor: string): Promise<{ status: OrderRow['status']; changed: boolean }>
  getOrder(orderId: string): Promise<OrderRow | null>
}

export interface MercadoPagoPort {
  createPayment(body: Record<string, unknown>, idempotencyKey: string, deviceId?: string): Promise<MpPayment>
  getPayment(id: string): Promise<MpPayment>
  refund(paymentId: string): Promise<void>
}

export interface ShippingPort {
  /** Cotação dos Correios para o CEP. Lança se o serviço estiver fora do ar (o handler usa a tabela de contingência). */
  quote(input: { originCep: string; destCep: string; lines: import('../shippingRules.ts').PackageLine[] }): Promise<import('../shippingRules.ts').RawQuote[]>
}

export interface Deps {
  repo: Repo
  mp: MercadoPagoPort
  shipping: ShippingPort
  storage: { download(path: string): Promise<ArrayBuffer> }
  mail: { send(to: string, mail: Mail): Promise<void> }
  now(): Date
  log(event: string, data?: Record<string, unknown>): void
  config: {
    siteUrl: string
    originCep: string
    freeShippingFrom: number
    pixRate: number
    maxInstallments: number
    minInstallment: number
    notificationUrl: string
    adminEmail?: string
    paymentsEnabled: boolean
    mpWebhookSecret?: string
  }
}

export interface HandlerResult {
  status: number
  body: unknown
}

export const ok = (body: unknown, status = 200): HandlerResult => ({ status, body })
export const fail = (e: unknown): HandlerResult => {
  if (e instanceof AppError) return { status: e.status, body: { error: { code: e.code, message: e.message } } }
  return { status: 500, body: { error: { code: 'internal', message: 'Algo deu errado. Tente novamente em instantes.' } } }
}
