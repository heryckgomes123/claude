import { onlyDigits, round2, toBrasiliaIso } from './money.ts'
import type { Address, PaymentMethod } from './types.ts'

export type MpStatus = 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back' | 'expired' | string

export interface MpPayment {
  id: number | string
  status: MpStatus
  status_detail?: string
  external_reference?: string
  transaction_amount?: number
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } }
  transaction_details?: { external_resource_url?: string; digitable_line?: string; total_paid_amount?: number }
  barcode?: { content?: string }
}

/** Mensagens claras para o cliente quando o cartão é recusado. */
const REJECTION: Record<string, string> = {
  cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente. Tente outro cartão ou pague com Pix.',
  cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
  cc_rejected_bad_filled_date: 'Confira a validade do cartão.',
  cc_rejected_bad_filled_security_code: 'Confira o código de segurança (CVV).',
  cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
  cc_rejected_call_for_authorize: 'O banco pediu autorização. Ligue para a central do cartão ou pague com Pix.',
  cc_rejected_card_disabled: 'Cartão desativado. Ligue para o banco ou use outro cartão.',
  cc_rejected_duplicated_payment: 'Pagamento duplicado: você já pagou este valor há pouco.',
  cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente pagar com Pix.',
  cc_rejected_max_attempts: 'Limite de tentativas atingido. Use outro cartão ou Pix.',
}
export const rejectionMessage = (detail?: string) => (detail && REJECTION[detail]) || 'O banco recusou o pagamento. Tente outro cartão ou pague com Pix.'

export interface BuildPaymentInput {
  orderId: string
  total: number
  method: PaymentMethod
  customer: { name: string; email: string; cpf: string }
  address?: (Address & { recipient?: string }) | null
  card?: { token: string; installments: number; paymentMethodId: string; issuerId?: string }
  notificationUrl: string
  expiresAt: Date
  items: { id: string; title: string; qty: number; unitPrice: number }[]
}

export function buildPaymentBody(i: BuildPaymentInput) {
  const [first, ...rest] = i.customer.name.trim().split(/\s+/)
  const payer: Record<string, unknown> = {
    email: i.customer.email,
    first_name: first,
    last_name: rest.join(' ') || first,
    identification: { type: 'CPF', number: onlyDigits(i.customer.cpf) },
  }
  const body: Record<string, unknown> = {
    transaction_amount: round2(i.total),
    description: `Bodemania — pedido ${i.orderId}`,
    external_reference: i.orderId,
    notification_url: i.notificationUrl,
    statement_descriptor: 'BODEMANIA',
    payer,
    additional_info: {
      items: i.items.map((it) => ({ id: it.id, title: it.title.slice(0, 100), quantity: it.qty, unit_price: round2(it.unitPrice) })),
    },
  }
  if (i.method === 'pix') {
    body.payment_method_id = 'pix'
    body.date_of_expiration = toBrasiliaIso(i.expiresAt)
  } else if (i.method === 'boleto') {
    body.payment_method_id = 'bolbradesco'
    body.date_of_expiration = toBrasiliaIso(i.expiresAt)
    if (i.address) {
      payer.address = {
        zip_code: onlyDigits(i.address.cep),
        street_name: i.address.street,
        street_number: i.address.number,
        neighborhood: i.address.district,
        city: i.address.city,
        federal_unit: i.address.uf,
      }
    }
  } else {
    if (!i.card) throw new Error('card_missing')
    body.token = i.card.token
    body.installments = i.card.installments
    body.payment_method_id = i.card.paymentMethodId
    if (i.card.issuerId) body.issuer_id = i.card.issuerId
  }
  return body
}

/** Dados de pagamento que guardamos no pedido e mostramos ao cliente. */
export function paymentView(method: PaymentMethod, p: MpPayment) {
  const td = p.point_of_interaction?.transaction_data
  return {
    method,
    mpId: String(p.id),
    mpStatus: p.status,
    pixCode: td?.qr_code,
    ticketUrl: td?.ticket_url ?? p.transaction_details?.external_resource_url,
    boletoLine: p.transaction_details?.digitable_line ?? p.barcode?.content,
    boletoUrl: p.transaction_details?.external_resource_url,
  }
}

// ───────── Webhook ─────────

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Valida o cabeçalho x-signature das notificações do Mercado Pago (HMAC-SHA256). */
export async function verifyMpSignature(opts: { secret: string; signature: string | null; requestId: string | null; dataId: string | null }) {
  if (!opts.secret || !opts.signature || !opts.dataId) return false
  const parts = Object.fromEntries(opts.signature.split(',').map((kv) => kv.trim().split('=') as [string, string]))
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false
  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId
  const manifest = `id:${id};request-id:${opts.requestId ?? ''};ts:${ts};`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(opts.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)))
  return safeEqual(sig, v1.toLowerCase())
}

/** Gera uma assinatura válida (usado nos testes). */
export async function signMpManifest(secret: string, dataId: string, requestId: string, ts: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  const sig = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`id:${id};request-id:${requestId};ts:${ts};`)))
  return `ts=${ts},v1=${sig}`
}
