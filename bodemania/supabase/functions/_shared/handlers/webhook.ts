import { verifyMpSignature } from '../mercadopago.ts'
import { AppError, ok, type Deps, type HandlerResult } from './ports.ts'
import { notifyStatus } from './orderMail.ts'

export interface WebhookRequest {
  query: URLSearchParams
  headers: { signature: string | null; requestId: string | null }
  body: unknown
}

/**
 * Notificação do Mercado Pago.
 * 1) confere a assinatura; 2) NÃO confia no corpo — busca o pagamento na API do MP; 3) aplica no pedido (idempotente).
 * Respostas: 200 = tratado/ignorado (o MP para de tentar) · 401 = assinatura inválida · 500 = erro nosso (o MP tenta de novo).
 */
export async function handleMpWebhook(deps: Deps, req: WebhookRequest): Promise<HandlerResult> {
  const body = (typeof req.body === 'object' && req.body ? req.body : {}) as { type?: string; topic?: string; action?: string; data?: { id?: string | number } }
  const dataId = req.query.get('data.id') ?? (body.data?.id !== undefined ? String(body.data.id) : null)
  const type = req.query.get('type') ?? req.query.get('topic') ?? body.type ?? body.topic ?? ''

  const secret = deps.config.mpWebhookSecret
  if (!secret) throw new AppError('webhook_not_configured', 'Webhook sem segredo configurado.', 503)
  const valid = await verifyMpSignature({ secret, signature: req.headers.signature, requestId: req.headers.requestId, dataId })
  if (!valid) {
    deps.log('mp_webhook_bad_signature', { dataId })
    throw new AppError('invalid_signature', 'Assinatura inválida.', 401)
  }
  if (type !== 'payment' || !dataId) return ok({ ignored: true })

  const payment = await deps.mp.getPayment(dataId)
  const orderId = payment.external_reference
  if (!orderId) return ok({ ignored: 'no_reference' })

  const before = await deps.repo.getOrder(orderId)
  if (!before) {
    deps.log('mp_webhook_unknown_order', { orderId, paymentId: payment.id })
    return ok({ ignored: 'unknown_order' })
  }

  let result
  try {
    result = await deps.repo.applyPayment(orderId, payment.status, String(payment.id), payment.transaction_amount ?? null, payment.status_detail ?? null)
  } catch (e) {
    if (e instanceof AppError && e.code === 'amount_mismatch') {
      deps.log('mp_amount_mismatch', { orderId, paymentId: payment.id, amount: payment.transaction_amount })
      return ok({ ignored: 'amount_mismatch' }) // alerta nos logs; não marca como pago
    }
    throw e
  }

  if (result.refundNeeded) await deps.mp.refund(String(payment.id))
  if (result.changed) {
    const after = await deps.repo.getOrder(orderId)
    if (after) await notifyStatus(deps, after, after.status)
  }
  return ok({ orderId, status: result.status })
}
