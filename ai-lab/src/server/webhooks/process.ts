import 'server-only'
import { and, eq } from 'drizzle-orm'
import { endSubscription, grantAccess, revokeByEmail, revokeSale } from '../access/grants'
import { db } from '../db'
import { webhookEvent, type GrantSource } from '../db/schema'
import { sendWelcomeEmail } from '../email'
import type { SaleEvent } from './parse'

export type Outcome = 'GRANTED' | 'REVOKED' | 'IGNORED' | 'REJECTED' | 'DUPLICATE' | 'ERROR'

type LogInput = {
  provider: GrantSource
  eventType: string
  outcome: Outcome
  detail?: string
  event?: SaleEvent
}

/** Registra o webhook. Reenvios do mesmo evento (mesmo id) atualizam o registro existente. */
export async function logWebhook({ provider, eventType, outcome, detail, event }: LogInput) {
  const values = {
    provider,
    // Eventos rejeitados nunca guardam o id — impede que alguém "reserve" ids de eventos legítimos.
    eventId: outcome === 'REJECTED' ? null : (event?.eventId ?? null),
    eventType,
    email: event?.email ?? null,
    externalRef: event?.externalRef ?? null,
    product: event?.productName ?? event?.productId ?? null,
    outcome,
    detail: detail?.slice(0, 500) ?? null,
  }
  if (!values.eventId) {
    await db.insert(webhookEvent).values(values)
    return
  }
  await db
    .insert(webhookEvent)
    .values(values)
    .onConflictDoUpdate({
      target: [webhookEvent.provider, webhookEvent.eventId],
      set: { outcome: values.outcome, detail: values.detail, createdAt: new Date() },
    })
}

async function alreadyProcessed(provider: GrantSource, eventId: string | null): Promise<boolean> {
  if (!eventId) return false
  const [row] = await db
    .select({ outcome: webhookEvent.outcome })
    .from(webhookEvent)
    .where(and(eq(webhookEvent.provider, provider), eq(webhookEvent.eventId, eventId)))
    .limit(1)
  return Boolean(row && row.outcome !== 'ERROR')
}

/** Aplica o evento de venda: libera, revoga ou ignora. Sempre registra o resultado. */
export async function processSale(provider: GrantSource, event: SaleEvent, allowedProduct: boolean): Promise<Outcome> {
  if (await alreadyProcessed(provider, event.eventId)) return 'DUPLICATE'

  let outcome: Outcome = 'IGNORED'
  let detail: string | undefined
  try {
    if (event.action === 'IGNORE') {
      detail = 'Evento sem efeito no acesso.'
    } else if (!allowedProduct) {
      detail = `Produto ${event.productId ?? '?'} não está na lista de produtos do Lab.`
    } else if (!event.email) {
      detail = 'Evento sem e-mail do comprador.'
    } else if (event.action === 'GRANT') {
      const { created } = await grantAccess({
        email: event.email,
        name: event.name,
        source: provider,
        externalRef: event.externalRef ?? event.eventId,
        product: event.productName ?? event.productId,
      })
      outcome = 'GRANTED'
      detail = created ? 'Acesso liberado.' : 'Acesso já existia — reativado.'
      if (created) await sendWelcomeEmail(event.email, event.name).catch((e) => console.error('[webhook] e-mail', e))
    } else if (event.action === 'REVOKE') {
      const count = event.externalRef
        ? await revokeSale(provider, event.externalRef)
        : await revokeByEmail(provider, event.email)
      outcome = 'REVOKED'
      detail = count ? 'Acesso revogado.' : 'Nenhuma liberação ativa encontrada para esta venda.'
    } else {
      const count = await endSubscription(provider, event.email, event.accessUntil)
      outcome = 'REVOKED'
      detail =
        event.accessUntil && event.accessUntil.getTime() > Date.now()
          ? `Assinatura cancelada — acesso até ${event.accessUntil.toISOString().slice(0, 10)} (${count}).`
          : `Assinatura cancelada — acesso revogado (${count}).`
    }
  } catch (error) {
    console.error(`[webhook:${provider}]`, error)
    outcome = 'ERROR'
    detail = 'Falha ao processar — a plataforma vai reenviar.'
  }

  await logWebhook({ provider, eventType: event.eventType, outcome, detail, event })
  return outcome
}
