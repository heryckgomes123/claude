import type { MailOrder } from '../emailTemplates.ts'
import type { Deps, OrderRow } from './ports.ts'
import * as T from '../emailTemplates.ts'

export function toMailOrder(o: OrderRow, note?: string): MailOrder {
  return {
    id: o.id,
    customerName: o.customer.name,
    customerEmail: o.customer.email,
    total: o.total,
    subtotal: o.subtotal,
    discount: o.discount,
    pixDiscount: o.pix_discount,
    shipping: o.shipping,
    items: o.items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unit_price, variant: i.variant ?? [], personalization: i.personalization })),
    shippingLabel: o.shipping_option.label,
    pickup: o.shipping_option.id === 'pickup',
    digitalOnly: o.digital_only,
    estimate: o.estimate,
    tracking: o.tracking,
    address: o.address,
    payment: { method: o.payment.method, pixCode: o.payment.pixCode, boletoLine: o.payment.boletoLine, boletoUrl: o.payment.boletoUrl },
    note,
  }
}

/** E-mail nunca derruba o fluxo: se falhar, só registramos. */
export async function safeSend(deps: Deps, to: string | undefined, mail: { subject: string; html: string }) {
  if (!to) return
  try {
    await deps.mail.send(to, mail)
  } catch (e) {
    deps.log('mail_failed', { to, subject: mail.subject, error: String(e) })
  }
}

export async function notifyStatus(deps: Deps, order: OrderRow, status: OrderRow['status'], note?: string) {
  const m = toMailOrder(order, note)
  const site = deps.config.siteUrl
  const mail =
    status === 'pago' ? T.orderPaid(site, m)
    : status === 'producao' ? T.orderInProduction(site, m)
    : status === 'enviado' ? T.orderShipped(site, m)
    : status === 'entregue' ? T.orderDelivered(site, m)
    : status === 'cancelado' ? T.orderCancelled(site, m)
    : null
  if (mail) await safeSend(deps, order.customer.email, mail)
  if (status === 'pago') await safeSend(deps, deps.config.adminEmail, T.adminNewPaidOrder(site, m))
}
