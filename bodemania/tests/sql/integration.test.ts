import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { handleAdminOrder, parseAdminOrder } from '../../supabase/functions/_shared/handlers/adminOrder.ts'
import { handleCreateOrder, type CreateOrderInput } from '../../supabase/functions/_shared/handlers/createOrder.ts'
import type { AppError } from '../../supabase/functions/_shared/handlers/ports.ts'
import { handleMpWebhook } from '../../supabase/functions/_shared/handlers/webhook.ts'
import { signMpManifest } from '../../supabase/functions/_shared/mercadopago.ts'
import { sampleSTL } from '../../supabase/functions/_shared/print3d.ts'
import { supabaseRepo } from '../../supabase/functions/_shared/server/supabaseRepo.ts'
import { harness, type Harness } from '../unit/fakes.ts'
import { pgSupabase } from './pgClient.ts'
import { createTestDb, hasDb, newUser } from './helpers.ts'

/** Handlers reais + repositório real (as mesmas chamadas que o Supabase receberá) + Postgres real. MP/Correios/e-mail são falsos. */
describe.skipIf(!hasDb)('integração: handlers ↔ banco', () => {
  let db: pg.Client
  let drop: () => Promise<void>
  let ana: string, bia: string, adm: string
  let h: Harness
  let base = 9000

  beforeAll(async () => {
    const t = await createTestDb()
    db = t.db
    drop = t.drop
    ana = await newUser(db, 'ana@exemplo.com', { name: 'Ana Souza', cpf: '529.982.247-25', phone: '(11) 98765-4321' })
    bia = await newUser(db, 'bia@exemplo.com', { name: 'Bia Lima', cpf: '11144477735', phone: '21987654321' })
    adm = await newUser(db, 'dono@bodemania.com.br', { name: 'Dono Loja' }, 'admin')
    await db.query(`insert into addresses (id, user_id, recipient, cep, street, number, district, city, uf)
                    values ('00000000-0000-0000-0000-0000000000a1', $1, 'Ana Souza', '20040020', 'Av. Rio Branco', '50', 'Centro', 'Rio de Janeiro', 'RJ'),
                           ('00000000-0000-0000-0000-0000000000a2', $2, 'Bia Lima', '20040020', 'Av. Rio Branco', '51', 'Centro', 'Rio de Janeiro', 'RJ')`, [ana, bia])
    await db.query(`insert into products (id, slug, name, category, price, stock, kind, weight, art, lead_days, options, personalization) values
      ('avental', 'avental', 'Avental de Mestre', 'aventais', 200, 10, 'physical', 0.5, 'avental', 7,
        '[{"id":"rito","label":"Rito","type":"chips","values":[{"id":"reaa","label":"REAA"},{"id":"york","label":"York","priceDelta":20}]}]',
        '{"label":"Iniciais","placeholder":"","maxLength":6,"price":25}'),
      ('s01', 's01', 'Impressão 3D sob medida', 'servicos-3d', 29, null, 'service', 0, 'servico', 3, '[]', null),
      ('modelagem', 'modelagem', 'Modelagem 3D', 'servicos-3d', 190, null, 'digital', 0, 'modelagem', 5, '[]', null)`)
    await db.query(`insert into coupons (code, label, percent) values ('BEMVINDO10', '10% de boas-vindas', 0.1)`)
  })
  afterAll(async () => drop?.())

  beforeEach(() => {
    h = harness((base += 100) + 1)
    h.deps.repo = supabaseRepo(pgSupabase(db))
    h.repo.profiles.clear()
  })

  const input = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
    idempotencyKey: 'idem-' + Math.random().toString(36).slice(2) + '-aaaa',
    lines: [{ productId: 'avental', qty: 1, options: { rito: 'reaa' } }],
    addressId: '00000000-0000-0000-0000-0000000000a1',
    shippingId: 'sedex',
    payment: { method: 'pix' },
    ...over,
  })
  const stock = async () => (await db.query(`select stock from products where id = 'avental'`)).rows[0].stock as number
  const row = async (id: string) => (await db.query('select * from orders where id = $1', [id])).rows[0]
  const err = async (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e)

  async function notify(paymentId: string, amount: number, status = 'approved') {
    const o = (await db.query(`select id from orders where payment->>'mpId' = $1`, [paymentId])).rows[0]
    h.payments.set(paymentId, { id: paymentId, status, external_reference: o.id, transaction_amount: amount })
    return handleMpWebhook(h.deps, {
      query: new URLSearchParams({ 'data.id': paymentId, type: 'payment' }),
      headers: { signature: await signMpManifest('segredo', paymentId, 'r1', '1'), requestId: 'r1' },
      body: {},
    })
  }

  it('Pix ponta a ponta: cria → webhook paga → painel envia → entrega', async () => {
    const before = await stock()
    const r = await handleCreateOrder(h.deps, ana, input({ coupon: 'BEMVINDO10' }))
    const { orderId } = r.body as { orderId: string }
    expect(orderId).toMatch(/^BM-\d+$/)
    expect(await stock()).toBe(before - 1)

    // R$ 200 − 10% = 180 + SEDEX 58,40 − 5% Pix de 180 (9,00) = 229,40
    let o = await row(orderId)
    expect(o).toMatchObject({ status: 'aguardando', subtotal: '200.00', discount: '20.00', pix_discount: '9.00', shipping: '58.40', total: '229.40', coupon: 'BEMVINDO10' })
    const mpId = String(base + 1)
    expect(o.payment).toMatchObject({ method: 'pix', pixCode: '00020126PIXCODE', mpId, mpStatus: 'pending' })
    expect((await db.query(`select uses from coupons where code = 'BEMVINDO10'`)).rows[0].uses).toBe(1)

    // o webhook confirma
    expect((await notify(mpId, 229.4)).body).toMatchObject({ status: 'pago' })
    o = await row(orderId)
    expect(o.status).toBe('pago')
    expect(o.paid_at).not.toBeNull()
    expect(h.sent.map((s) => s.mail.subject)).toContain(`Pagamento confirmado — pedido ${orderId}`)

    // painel
    const set = (status: string, extra = {}) => handleAdminOrder(h.deps, adm, parseAdminOrder({ orderId, status, ...extra }))
    h.deps.repo.getProfile = supabaseRepo(pgSupabase(db)).getProfile
    await set('producao')
    expect(await err(set('enviado'))).toMatchObject({ code: 'tracking_required' })
    await set('enviado', { tracking: 'pc111222333br' })
    await set('entregue')
    o = await row(orderId)
    expect(o).toMatchObject({ status: 'entregue', tracking: 'PC111222333BR' })
    const events = (await db.query('select status from order_events where order_id = $1 order by id', [orderId])).rows.map((e) => e.status)
    expect(events).toEqual(['aguardando', 'pago', 'producao', 'enviado', 'entregue'])
    expect(h.sent.at(-1)!.mail.subject).toBe(`Pedido ${orderId} entregue`)
  })

  it('cliente comum não opera o painel (papel vem do banco)', async () => {
    const { orderId } = (await handleCreateOrder(h.deps, ana, input())).body as { orderId: string }
    expect(await err(handleAdminOrder(h.deps, ana, parseAdminOrder({ orderId, status: 'pago' })))).toMatchObject({ code: 'forbidden' })
    expect((await row(orderId)).status).toBe('aguardando')
  })

  it('duplo clique: mesma chave devolve o mesmo pedido, sem cobrar nem baixar estoque de novo', async () => {
    const i = input()
    const before = await stock()
    const a = (await handleCreateOrder(h.deps, ana, i)).body as { orderId: string }
    const b = (await handleCreateOrder(h.deps, ana, i)).body as { orderId: string }
    expect(a.orderId).toBe(b.orderId)
    expect(await stock()).toBe(before - 1)
    expect(h.mpCalls).toHaveLength(1)
    // outro cliente com a mesma chave NÃO recebe o pedido da Ana
    const c = (await handleCreateOrder(h.deps, bia, { ...i, addressId: '00000000-0000-0000-0000-0000000000a2' })).body as { orderId: string }
    expect(c.orderId).not.toBe(a.orderId)
  })

  it('endereço de outra pessoa é recusado pelo banco (RLS não é contornada pelo cliente)', async () => {
    expect(await err(handleCreateOrder(h.deps, ana, input({ addressId: '00000000-0000-0000-0000-0000000000a2' })))).toMatchObject({ code: 'address_required' })
  })

  it('estoque: último item vai para um só cliente', async () => {
    await db.query(`update products set stock = 1 where id = 'avental'`)
    await handleCreateOrder(h.deps, ana, input())
    const e = await err(handleCreateOrder(h.deps, bia, input({ addressId: '00000000-0000-0000-0000-0000000000a2' })))
    expect(e).toMatchObject({ code: 'out_of_stock', status: 409, message: expect.stringContaining('Avental de Mestre') })
    expect(await stock()).toBe(0)
    await db.query(`update products set stock = 50 where id = 'avental'`)
  })

  it('cartão recusado: pedido cancelado, estoque e cupom voltam', async () => {
    h.setMp((b) => ({ id: 31, status: 'rejected', status_detail: 'cc_rejected_bad_filled_security_code', external_reference: b.external_reference }))
    const before = await stock()
    const uses = (await db.query(`select uses from coupons where code = 'BEMVINDO10'`)).rows[0].uses
    const e = await err(handleCreateOrder(h.deps, ana, input({ coupon: 'BEMVINDO10', payment: { method: 'card', card: { token: 't', installments: 1, paymentMethodId: 'visa' } } })))
    expect(e).toMatchObject({ code: 'card_rejected', message: expect.stringContaining('CVV') })
    expect(await stock()).toBe(before)
    expect((await db.query(`select uses from coupons where code = 'BEMVINDO10'`)).rows[0].uses).toBe(uses)
    const last = (await db.query(`select status from orders order by created_at desc limit 1`)).rows[0]
    expect(last.status).toBe('cancelado')
  })

  it('Mercado Pago fora do ar: pedido cancelado e estoque devolvido', async () => {
    h.setMp(() => {
      throw new Error('503')
    })
    const before = await stock()
    expect(await err(handleCreateOrder(h.deps, ana, input()))).toMatchObject({ code: 'payment_unavailable' })
    expect(await stock()).toBe(before)
  })

  it('webhook com valor errado não paga; Pix pago após o vencimento é estornado', async () => {
    const { orderId } = (await handleCreateOrder(h.deps, ana, input())).body as { orderId: string }
    const mpId = (await row(orderId)).payment.mpId as string
    expect((await notify(mpId, 5)).body).toMatchObject({ ignored: 'amount_mismatch' })
    expect((await row(orderId)).status).toBe('aguardando')

    await db.query(`update orders set expires_at = now() - interval '1 minute' where id = $1`, [orderId])
    await db.query('select public.expire_unpaid_orders()')
    expect((await row(orderId)).status).toBe('cancelado')
    const total = Number((await row(orderId)).total)
    await notify(mpId, total)
    expect(h.refunds).toContain(mpId)
    expect((await row(orderId)).status).toBe('cancelado')
  })

  it('digital (modelagem 3D) não tem frete nem endereço', async () => {
    const { orderId } = (await handleCreateOrder(h.deps, ana, input({ lines: [{ productId: 'modelagem', qty: 1, options: {} }], addressId: undefined, shippingId: 'digital' }))).body as { orderId: string }
    expect(await row(orderId)).toMatchObject({ digital_only: true, shipping: '0.00', total: '180.50', address: null })
  })

  it('impressão 3D: preço calculado no servidor a partir do STL guardado, e o arquivo vai junto no pedido', async () => {
    h.files.set(`${ana}/vaso.stl`, sampleSTL())
    const line = { productId: 's01', qty: 1, options: {}, print: { filePath: `${ana}/vaso.stl`, fileName: 'vaso.stl', scale: 100, material: 'pla', quality: 'padrao', infill: 25, color: 'dourado' } }
    const { orderId } = (await handleCreateOrder(h.deps, ana, input({ lines: [line] }))).body as { orderId: string }
    const item = (await db.query('select * from order_items where order_id = $1', [orderId])).rows[0]
    expect(item.print).toMatchObject({ origin: 'arquivo', filePath: `${ana}/vaso.stl`, material: 'pla', color: 'dourado' })
    expect(Number(item.unit_price)).toBeGreaterThan(29)
    expect(item.name).toBe('Impressão 3D — vaso.stl')
  })
})
