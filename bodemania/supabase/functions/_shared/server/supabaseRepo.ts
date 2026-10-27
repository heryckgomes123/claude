import { universeOfCategory } from '../categories.ts'
import { AppError, type AddressRow, type OrderRow, type ProfileRow, type Repo } from '../handlers/ports.ts'
import type { CatalogProduct } from '../types.ts'

const KNOWN = ['out_of_stock', 'product_unavailable', 'coupon_unavailable', 'amount_mismatch', 'invalid_transition', 'order_not_found']

/** Erros que escrevemos no banco (raise exception 'codigo') viram AppError; o resto vira erro interno. */
function wrap(error: { message: string; details?: string } | null) {
  if (!error) return
  const status = error.message === 'order_not_found' ? 404 : 409
  if (KNOWN.includes(error.message)) throw new AppError(error.message, error.message, status, error.details)
  throw new Error(`banco: ${error.message}`)
}

export function productFromRow(r: Record<string, any>): CatalogProduct {
  return {
    id: r.id, slug: r.slug, name: r.name, price: Number(r.price), kind: r.kind, weight: Number(r.weight), leadDays: r.lead_days,
    stock: r.stock, active: r.active, options: r.options ?? [], personalization: r.personalization ?? null, photoUpload: r.photo_upload ?? null,
    art: r.art, tone: r.tone, universe: universeOfCategory(r.category),
    widthCm: Number(r.width_cm), heightCm: Number(r.height_cm), lengthCm: Number(r.length_cm),
  }
}

const ORDER_SELECT = '*, items:order_items(product_id,name,unit_price,qty,variant,personalization)'

/** O mínimo do cliente do Supabase que usamos (permite testar com um cliente falso sobre Postgres). */
export interface Db {
  from(table: string): any
  rpc(name: string, params: Record<string, unknown>): PromiseLike<{ data: any; error: { message: string; details?: string } | null }>
}

export function supabaseRepo(db: Db): Repo {
  return {
    async getProfile(userId) {
      const { data, error } = await db.from('profiles').select('id,name,email,cpf,phone,role').eq('id', userId).maybeSingle()
      wrap(error)
      return (data as ProfileRow | null) ?? null
    },
    async getAddress(userId, addressId) {
      const { data, error } = await db.from('addresses').select('*').eq('id', addressId).eq('user_id', userId).maybeSingle()
      wrap(error)
      return (data as AddressRow | null) ?? null
    },
    async getProducts(ids) {
      const { data, error } = await db.from('products').select('*').in('id', ids)
      wrap(error)
      return (data ?? []).map(productFromRow)
    },
    async checkCoupon(code, subtotal) {
      const { data, error } = await db.rpc('check_coupon', { p_code: code, p_subtotal: subtotal })
      wrap(error)
      return data.ok ? { ok: true, coupon: { code: data.code, label: data.label, percent: data.percent, amount: data.amount, freeShipping: data.freeShipping, min: data.min } } : { ok: false, error: data.error }
    },
    async placeOrder(order, items) {
      const { data, error } = await db.rpc('place_order', { p_order: order, p_items: items })
      wrap(error)
      return data as string
    },
    async findOrderByIdem(userId, key) {
      const { data, error } = await db.from('orders').select(ORDER_SELECT).eq('user_id', userId).eq('payment->>idem', key).neq('status', 'cancelado').maybeSingle()
      wrap(error)
      return (data as OrderRow | null) ?? null
    },
    async patchPayment(orderId, patch, expiresAt) {
      const { error } = await db.rpc('patch_order_payment', { p_order_id: orderId, p_patch: patch, p_expires: expiresAt?.toISOString() ?? null })
      wrap(error)
    },
    async cancelOrder(orderId, note) {
      const { error } = await db.rpc('cancel_order', { p_order_id: orderId, p_note: note })
      wrap(error)
    },
    async applyPayment(orderId, mpStatus, mpId, amount, detail) {
      const { data, error } = await db.rpc('apply_payment', { p_order_id: orderId, p_mp_status: mpStatus, p_mp_id: mpId, p_amount: amount, p_detail: detail })
      wrap(error)
      return data
    },
    async adminSetStatus(orderId, status, note, tracking, actor) {
      const { data, error } = await db.rpc('admin_set_status', { p_order_id: orderId, p_status: status, p_note: note, p_tracking: tracking, p_actor: actor })
      wrap(error)
      return data
    },
    async getOrder(orderId) {
      const { data, error } = await db.from('orders').select(ORDER_SELECT).eq('id', orderId).maybeSingle()
      wrap(error)
      return (data as OrderRow | null) ?? null
    },
  }
}
