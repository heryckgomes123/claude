import { AppError, ok, type Deps, type HandlerResult, type OrderRow } from './ports.ts'
import { notifyStatus } from './orderMail.ts'

export interface AdminOrderInput {
  orderId: string
  status: OrderRow['status']
  note?: string
  tracking?: string
  /** cancelar um pedido já pago: devolver o dinheiro pelo Mercado Pago */
  refund?: boolean
}

const STATUSES = ['aguardando', 'pago', 'producao', 'enviado', 'entregue', 'cancelado']

export function parseAdminOrder(body: unknown): AdminOrderInput {
  const b = (typeof body === 'object' && body ? body : {}) as Record<string, unknown>
  if (typeof b.orderId !== 'string' || !/^BM-\d+$/.test(b.orderId)) throw new AppError('bad_request', 'Pedido inválido.')
  if (typeof b.status !== 'string' || !STATUSES.includes(b.status)) throw new AppError('bad_request', 'Status inválido.')
  return {
    orderId: b.orderId,
    status: b.status as OrderRow['status'],
    note: typeof b.note === 'string' ? b.note.slice(0, 300) : undefined,
    tracking: typeof b.tracking === 'string' ? b.tracking.trim().toUpperCase().slice(0, 40) : undefined,
    refund: b.refund === true,
  }
}

/** Painel: muda o status do pedido, avisa o cliente e (opcional) estorna no Mercado Pago. */
export async function handleAdminOrder(deps: Deps, userId: string, input: AdminOrderInput): Promise<HandlerResult> {
  const me = await deps.repo.getProfile(userId)
  if (me?.role !== 'admin') throw new AppError('forbidden', 'Acesso restrito à equipe da loja.', 403)

  const order = await deps.repo.getOrder(input.orderId)
  if (!order) throw new AppError('not_found', 'Pedido não encontrado.', 404)

  if (input.status === 'enviado' && !input.tracking && !order.digital_only && order.shipping_option.id !== 'pickup') {
    throw new AppError('tracking_required', 'Informe o código de rastreio para marcar como enviado.')
  }

  let result
  try {
    result = await deps.repo.adminSetStatus(input.orderId, input.status, input.note ?? null, input.tracking ?? null, userId)
  } catch (e) {
    if (e instanceof AppError && e.code === 'invalid_transition') throw new AppError('invalid_transition', 'Esta mudança de status não é permitida para o pedido.', 409)
    throw e
  }

  let refunded = false
  if (result.changed && input.status === 'cancelado' && input.refund && order.payment.mpId && order.status !== 'aguardando') {
    try {
      await deps.mp.refund(String(order.payment.mpId))
      refunded = true
    } catch (e) {
      deps.log('refund_failed', { orderId: order.id, error: String(e) })
      throw new AppError('refund_failed', 'O pedido foi cancelado, mas o estorno falhou. Faça o estorno pelo painel do Mercado Pago.', 502)
    }
  }

  if (result.changed) {
    const after = await deps.repo.getOrder(input.orderId)
    if (after) await notifyStatus(deps, after, result.status, input.note)
  }
  return ok({ status: result.status, changed: result.changed, refunded })
}
