/**
 * Interpretação dos webhooks de venda (funções puras — testadas em tests/unit/webhooks.test.ts).
 *
 * Hotmart (webhook 2.0): JSON com `event` e `data.{buyer,product,purchase,subscriber}`;
 *   autenticidade pelo cabeçalho X-HOTMART-HOTTOK.
 * Kiwify: JSON com `order_status`, `webhook_event_type`, `Customer` e `Product`;
 *   autenticidade pela query `?signature=` = HMAC-SHA1(corpo bruto, token).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export type SaleAction = 'GRANT' | 'REVOKE' | 'END_SUBSCRIPTION' | 'IGNORE'

export type SaleEvent = {
  action: SaleAction
  eventType: string
  eventId: string | null
  email: string | null
  name: string | null
  externalRef: string | null
  productId: string | null
  productName: string | null
  /** Para END_SUBSCRIPTION: acesso segue até esta data (fim do período pago), se informada. */
  accessUntil: Date | null
}

type Json = Record<string, unknown>

function obj(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {}
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function email(value: unknown): string | null {
  const v = str(value)?.toLowerCase() ?? null
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null
}

function date(value: unknown): Date | null {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value)
  const v = str(value)
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/* ---------------------------------- Hotmart --------------------------------- */

const HOTMART_GRANT = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'])
const HOTMART_REVOKE = new Set(['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'PURCHASE_PROTEST'])

export function parseHotmart(payload: unknown): SaleEvent {
  const root = obj(payload)
  const data = obj(root.data)
  const buyer = obj(data.buyer)
  const subscriber = obj(data.subscriber)
  const product = obj(data.product)
  const purchase = obj(data.purchase)
  const eventType = str(root.event)?.toUpperCase() ?? 'DESCONHECIDO'

  let action: SaleAction = 'IGNORE'
  if (HOTMART_GRANT.has(eventType)) action = 'GRANT'
  else if (HOTMART_REVOKE.has(eventType)) action = 'REVOKE'
  else if (eventType === 'SUBSCRIPTION_CANCELLATION') action = 'END_SUBSCRIPTION'

  return {
    action,
    eventType,
    eventId: str(root.id),
    email: email(buyer.email) ?? email(subscriber.email),
    name: str(buyer.name) ?? str(subscriber.name),
    externalRef: str(purchase.transaction),
    productId: str(product.id),
    productName: str(product.name),
    accessUntil: date(data.date_next_charge),
  }
}

/* ---------------------------------- Kiwify ---------------------------------- */

export function parseKiwify(payload: unknown): SaleEvent {
  const root = obj(payload)
  const customer = obj(root.Customer)
  const product = obj(root.Product)
  const subscription = obj(root.Subscription)
  const status = str(root.order_status)?.toLowerCase() ?? ''
  const eventType = (str(root.webhook_event_type) ?? status) || 'desconhecido'
  const orderId = str(root.order_id)

  let action: SaleAction = 'IGNORE'
  if (status === 'refunded' || status === 'chargedback' || eventType === 'order_refunded' || eventType === 'chargeback')
    action = 'REVOKE'
  else if (eventType === 'subscription_canceled') action = 'END_SUBSCRIPTION'
  else if (status === 'paid') action = 'GRANT'

  return {
    action,
    eventType,
    eventId: orderId ? `${orderId}:${eventType}` : null,
    email: email(customer.email),
    name: str(customer.full_name) ?? str(customer.first_name),
    externalRef: orderId,
    productId: str(product.product_id),
    productName: str(product.product_name),
    accessUntil: date(subscription.next_payment),
  }
}

/* -------------------------------- Autenticidade ------------------------------ */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function verifyHotmartToken(received: string | null, expected: string): boolean {
  return Boolean(received) && safeEqual(received!.trim(), expected)
}

export function kiwifySignature(rawBody: string, token: string): string {
  return createHmac('sha1', token).update(rawBody).digest('hex')
}

export function verifyKiwifySignature(rawBody: string, signature: string | null, token: string): boolean {
  if (!signature) return false
  return safeEqual(signature.trim().toLowerCase(), kiwifySignature(rawBody, token))
}

/** Se a lista de produtos estiver vazia, qualquer produto da conta é aceito. */
export function productAllowed(event: Pick<SaleEvent, 'productId'>, allowed: string[]): boolean {
  if (allowed.length === 0) return true
  return Boolean(event.productId && allowed.includes(event.productId))
}
