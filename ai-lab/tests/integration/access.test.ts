import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migrateTestDb, TEST_DB } from './setup'

/**
 * Fluxo real de acesso no Postgres: compra → liberação → reembolso → bloqueio.
 * Rode com: TEST_DATABASE_URL=postgres://…/intelra_lab_test npm test
 */
describe.skipIf(!TEST_DB)('acesso por compra (Postgres)', () => {
  let grants: typeof import('@/server/access/grants')
  let process_: typeof import('@/server/webhooks/process')
  let parse: typeof import('@/server/webhooks/parse')
  let db: typeof import('@/server/db').db
  let sql: typeof import('drizzle-orm').sql

  beforeAll(async () => {
    migrateTestDb()
    grants = await import('@/server/access/grants')
    process_ = await import('@/server/webhooks/process')
    parse = await import('@/server/webhooks/parse')
    db = (await import('@/server/db')).db
    sql = (await import('drizzle-orm')).sql
  })

  beforeEach(async () => {
    await db.execute(sql`truncate access_grant, webhook_event`)
  })

  const approved = (email: string, transaction: string, id = `evt-${transaction}`) =>
    parse.parseHotmart({
      id,
      event: 'PURCHASE_APPROVED',
      data: { buyer: { email, name: 'Comprador' }, product: { id: 1, name: 'LAB' }, purchase: { transaction } },
    })

  it('compra aprovada libera o e-mail (sem diferenciar maiúsculas)', async () => {
    expect(await grants.hasActiveGrant('comprador@teste.com')).toBe(false)
    expect(await process_.processSale('HOTMART', approved('Comprador@Teste.com', 'T1'), true)).toBe('GRANTED')
    expect(await grants.hasActiveGrant(' COMPRADOR@teste.com ')).toBe(true)
  })

  it('reenvio do mesmo evento é idempotente', async () => {
    await process_.processSale('HOTMART', approved('a@teste.com', 'T1'), true)
    expect(await process_.processSale('HOTMART', approved('a@teste.com', 'T1'), true)).toBe('DUPLICATE')
    const rows = await db.execute<{ n: number }>(sql`select count(*)::int as n from access_grant`)
    expect(rows[0].n).toBe(1)
  })

  it('reembolso revoga só a venda reembolsada', async () => {
    await process_.processSale('HOTMART', approved('b@teste.com', 'T1'), true)
    await process_.processSale('HOTMART', approved('b@teste.com', 'T2'), true)
    const refund = parse.parseHotmart({
      id: 'evt-refund',
      event: 'PURCHASE_REFUNDED',
      data: { buyer: { email: 'b@teste.com' }, purchase: { transaction: 'T1' } },
    })
    expect(await process_.processSale('HOTMART', refund, true)).toBe('REVOKED')
    expect(await grants.hasActiveGrant('b@teste.com')).toBe(true) // ainda tem a venda T2
    await process_.processSale(
      'HOTMART',
      parse.parseHotmart({ id: 'evt-cb', event: 'PURCHASE_CHARGEBACK', data: { buyer: { email: 'b@teste.com' }, purchase: { transaction: 'T2' } } }),
      true,
    )
    expect(await grants.hasActiveGrant('b@teste.com')).toBe(false)
  })

  it('produto fora da lista não libera acesso', async () => {
    expect(await process_.processSale('HOTMART', approved('c@teste.com', 'T9'), false)).toBe('IGNORED')
    expect(await grants.hasActiveGrant('c@teste.com')).toBe(false)
  })

  it('assinatura cancelada mantém o acesso até o fim do período pago', async () => {
    await process_.processSale('KIWIFY', parse.parseKiwify({ order_id: 'k1', order_status: 'paid', Customer: { email: 'd@teste.com' } }), true)
    const future = new Date(Date.now() + 5 * 86400_000).toISOString()
    await process_.processSale(
      'KIWIFY',
      parse.parseKiwify({ order_id: 'k1', webhook_event_type: 'subscription_canceled', Customer: { email: 'd@teste.com' }, Subscription: { next_payment: future } }),
      true,
    )
    expect(await grants.hasActiveGrant('d@teste.com')).toBe(true)
    await db.execute(sql`update access_grant set expires_at = now() - interval '1 minute'`)
    expect(await grants.hasActiveGrant('d@teste.com')).toBe(false)
  })

  it('liberação manual pode ser bloqueada e reativada', async () => {
    const { id } = await grants.grantAccess({ email: 'e@teste.com', source: 'MANUAL' })
    const again = await grants.grantAccess({ email: 'E@teste.com', source: 'MANUAL' })
    expect(again).toEqual({ id, created: false })
    await grants.setGrantStatus(id, 'REVOKED')
    expect(await grants.hasActiveGrant('e@teste.com')).toBe(false)
    await grants.setGrantStatus(id, 'ACTIVE')
    expect(await grants.hasActiveGrant('e@teste.com')).toBe(true)
  })

  it('reembolso de uma venda não afeta a liberação manual do mesmo e-mail', async () => {
    await grants.grantAccess({ email: 'f@teste.com', source: 'MANUAL' })
    await process_.processSale('HOTMART', approved('f@teste.com', 'T5'), true)
    await grants.revokeSale('HOTMART', 'T5')
    expect(await grants.hasActiveGrant('f@teste.com')).toBe(true)
  })
})
