import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { as, createTestDb, hasDb, item, newProduct, newUser, orderPayload } from './helpers.ts'

describe.skipIf(!hasDb)('banco de dados (Postgres real)', () => {
  let db: pg.Client
  let drop: () => Promise<void>
  let ana: string, bia: string, admin: string

  beforeAll(async () => {
    const t = await createTestDb()
    db = t.db
    drop = t.drop
    ana = await newUser(db, 'ana@exemplo.com', { name: 'Ana Souza', cpf: '529.982.247-25', phone: '(11) 98765-4321', newsletter: false })
    bia = await newUser(db, 'bia@exemplo.com', { name: 'Bia Lima' })
    admin = await newUser(db, 'dono@bodemania.com.br', { name: 'Dono' }, 'admin')
  })
  afterAll(async () => drop?.())

  const stock = async (id: string) => (await db.query('select stock from products where id=$1', [id])).rows[0].stock as number
  const place = (userId: string, items: unknown[], order = orderPayload(userId)) =>
    as(db, 'service_role', null, async () => (await db.query('select public.place_order($1, $2) as id', [order, JSON.stringify(items)])).rows[0].id as string, true)

  describe('cadastro e perfil', () => {
    it('cria o perfil automaticamente, guardando só dígitos de CPF e telefone', async () => {
      const { rows } = await db.query('select * from profiles where id = $1', [ana])
      expect(rows[0]).toMatchObject({ name: 'Ana Souza', cpf: '52998224725', phone: '11987654321', newsletter: false, role: 'customer' })
    })

    it('cadastro com metadados lixo não quebra (newsletter inválida vira padrão)', async () => {
      const id = await newUser(db, 'lixo@exemplo.com', { newsletter: 'talvez', cpf: 123 })
      const { rows } = await db.query('select newsletter from profiles where id = $1', [id])
      expect(rows[0].newsletter).toBe(false) // 'talvez' <> 'true'
    })

    it('cliente vê só o próprio perfil; admin vê todos', async () => {
      const mine = await as(db, 'authenticated', ana, async () => (await db.query('select id from profiles')).rows)
      expect(mine.map((r) => r.id)).toEqual([ana])
      const all = await as(db, 'authenticated', admin, async () => (await db.query('select id from profiles')).rows)
      expect(all.length).toBeGreaterThanOrEqual(3)
    })

    it('cliente NÃO consegue se promover a admin nem mexer no perfil de outro', async () => {
      await expect(as(db, 'authenticated', ana, () => db.query(`update profiles set role = 'admin' where id = $1`, [ana]))).rejects.toThrow(/permission denied/)
      const r = await as(db, 'authenticated', ana, () => db.query(`update profiles set name = 'Hackeada' where id = $1`, [bia]))
      expect(r.rowCount).toBe(0)
      const ok = await as(db, 'authenticated', ana, () => db.query(`update profiles set name = 'Ana S.' where id = $1`, [ana]))
      expect(ok.rowCount).toBe(1)
    })

    it('anônimo não lê perfis', async () => {
      await expect(as(db, 'anon', null, () => db.query('select * from profiles'))).rejects.toThrow(/permission denied/)
    })
  })

  describe('endereços', () => {
    const addr = (userId: string) => [userId, 'Ana', '01310100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP']
    const insert = `insert into addresses (user_id, recipient, cep, street, number, district, city, uf) values ($1,$2,$3,$4,$5,$6,$7,$8)`

    it('cada cliente só enxerga e cria os próprios endereços', async () => {
      await as(db, 'authenticated', ana, () => db.query(insert, addr(ana)), true)
      const bias = await as(db, 'authenticated', bia, async () => (await db.query('select * from addresses')).rows)
      expect(bias).toHaveLength(0)
      await expect(as(db, 'authenticated', bia, () => db.query(insert, addr(ana)))).rejects.toThrow(/row-level security/)
    })

    it('rejeita CEP inválido', async () => {
      await expect(as(db, 'authenticated', ana, () => db.query(insert, [ana, 'Ana', '123', 'Rua', '1', 'B', 'C', 'SP']))).rejects.toThrow(/check constraint/)
    })
  })

  describe('catálogo', () => {
    beforeAll(async () => {
      await newProduct(db, 'v1', { stock: 10 })
      await newProduct(db, 'inativo', { active: false })
    })

    it('visitante vê só produtos ativos', async () => {
      const rows = await as(db, 'anon', null, async () => (await db.query(`select id from products where id in ('v1','inativo')`)).rows)
      expect(rows.map((r) => r.id)).toEqual(['v1'])
    })

    it('admin vê tudo e edita; cliente e visitante não editam', async () => {
      const adminRows = await as(db, 'authenticated', admin, async () => (await db.query(`select id from products where id in ('v1','inativo')`)).rows)
      expect(adminRows).toHaveLength(2)
      const up = await as(db, 'authenticated', admin, () => db.query(`update products set price = 150 where id = 'v1'`))
      expect(up.rowCount).toBe(1)
      const hack = await as(db, 'authenticated', ana, () => db.query(`update products set price = 0.01 where id = 'v1'`))
      expect(hack.rowCount).toBe(0)
      await expect(as(db, 'anon', null, () => db.query(`update products set price = 0.01 where id = 'v1'`))).rejects.toThrow(/permission denied/)
      await expect(as(db, 'authenticated', ana, () => db.query(`insert into products (id, slug, name, category, price) values ('x','x','x','x',1)`))).rejects.toThrow(/row-level security/)
      await db.query(`update products set price = 100 where id = 'v1'`)
    })
  })

  describe('cupons', () => {
    beforeAll(async () => {
      await db.query(`insert into coupons (code, label, percent, min_subtotal) values ('IRMAO15', '15% acima de R$ 400', 0.15, 400)`)
      await db.query(`insert into coupons (code, label, percent, max_uses, uses) values ('ESGOTADO', 'Esgotado', 0.1, 5, 5)`)
      await db.query(`insert into coupons (code, label, percent, expires_at) values ('VENCIDO', 'Vencido', 0.1, now() - interval '1 day')`)
      await db.query(`insert into coupons (code, label, free_shipping, min_subtotal) values ('FRETEGRATIS', 'Frete grátis', true, 150)`)
    })
    const check = (code: string, subtotal: number) => as(db, 'anon', null, async () => (await db.query('select public.check_coupon($1, $2) as r', [code, subtotal])).rows[0].r)

    it('ninguém lista cupons (nem logado)', async () => {
      await expect(as(db, 'anon', null, () => db.query('select * from coupons'))).rejects.toThrow(/permission denied/)
      const rows = await as(db, 'authenticated', ana, async () => (await db.query('select * from coupons')).rows)
      expect(rows).toHaveLength(0)
    })

    it('valida cupom, mínimo, validade e limite de usos', async () => {
      expect(await check('irmao15', 500)).toMatchObject({ ok: true, code: 'IRMAO15', percent: 0.15 })
      expect(await check('IRMAO15', 100)).toMatchObject({ ok: false, error: expect.stringContaining('R$ 400') })
      expect(await check('ESGOTADO', 500)).toMatchObject({ ok: false })
      expect(await check('VENCIDO', 500)).toMatchObject({ ok: false })
      expect(await check('NAOEXISTE', 500)).toMatchObject({ ok: false })
      expect(await check('FRETEGRATIS', 200)).toMatchObject({ ok: true, freeShipping: true })
    })
  })

  describe('pedidos', () => {
    beforeAll(async () => {
      await newProduct(db, 'avental', { stock: 100, price: 100 })
      await newProduct(db, 'digital', { stock: null })
    })

    it('cliente não cria nem altera pedido direto — só o servidor', async () => {
      await expect(
        as(db, 'authenticated', ana, () => db.query(`select public.place_order($1, $2)`, [orderPayload(ana), JSON.stringify([item('avental')])])),
      ).rejects.toThrow(/permission denied/)
      await expect(as(db, 'authenticated', ana, () => db.query(`insert into orders (id, subtotal, total, customer, shipping_option) values ('X', 1, 1, '{}', '{}')`))).rejects.toThrow(/permission denied/)
      await expect(as(db, 'anon', null, () => db.query(`select public.apply_payment('BM-1','approved','1',1)`))).rejects.toThrow(/permission denied/)
    })

    it('cria pedido: numera, baixa estoque, grava itens e evento', async () => {
      const before = await stock('avental')
      const id = await place(ana, [item('avental', 2)], orderPayload(ana, 200))
      expect(id).toMatch(/^BM-\d+$/)
      expect(await stock('avental')).toBe(before - 2)
      const items = (await db.query('select qty, unit_price from order_items where order_id = $1', [id])).rows
      expect(items).toEqual([{ qty: 2, unit_price: '100.00' }])
      const ev = (await db.query('select status from order_events where order_id = $1', [id])).rows
      expect(ev).toEqual([{ status: 'aguardando' }])
    })

    it('produto sem controle de estoque (null) nunca esgota', async () => {
      await place(ana, [item('digital', 50)])
      expect((await db.query(`select stock from products where id = 'digital'`)).rows[0].stock).toBeNull()
    })

    it('estoque insuficiente derruba o pedido inteiro e não baixa nada', async () => {
      const before = await stock('avental')
      await expect(place(ana, [item('avental', 1), item('avental', before + 1)])).rejects.toThrow(/out_of_stock/)
      expect(await stock('avental')).toBe(before)
    })

    it('produto inativo ou inexistente é recusado', async () => {
      await expect(place(ana, [item('inativo')])).rejects.toThrow(/product_unavailable/)
      await expect(place(ana, [item('fantasma')])).rejects.toThrow(/product_unavailable/)
    })

    it('cliente vê só os próprios pedidos (e itens/eventos); admin vê todos', async () => {
      const idA = await place(ana, [item('digital')])
      const idB = await place(bia, [item('digital')])
      const a = await as(db, 'authenticated', ana, async () => (await db.query('select id from orders')).rows.map((r) => r.id))
      expect(a).toContain(idA)
      expect(a).not.toContain(idB)
      const itemsSeenByAna = await as(db, 'authenticated', ana, async () => (await db.query('select order_id from order_items')).rows.map((r) => r.order_id))
      expect(itemsSeenByAna).not.toContain(idB)
      const eventsSeenByBia = await as(db, 'authenticated', bia, async () => (await db.query('select order_id from order_events')).rows.map((r) => r.order_id))
      expect(eventsSeenByBia).toContain(idB)
      expect(eventsSeenByBia).not.toContain(idA)
      const all = await as(db, 'authenticated', admin, async () => (await db.query('select id from orders')).rows.map((r) => r.id))
      expect(all).toEqual(expect.arrayContaining([idA, idB]))
    })

    it('cupom: conta o uso e respeita o limite', async () => {
      await db.query(`insert into coupons (code, label, percent, max_uses) values ('UMA_VEZ', 'Uma vez', 0.1, 1)`)
      await place(ana, [item('digital')], orderPayload(ana, 90, { coupon: 'UMA_VEZ', discount: 10 }))
      expect((await db.query(`select uses from coupons where code = 'UMA_VEZ'`)).rows[0].uses).toBe(1)
      await expect(place(bia, [item('digital')], orderPayload(bia, 90, { coupon: 'UMA_VEZ', discount: 10 }))).rejects.toThrow(/coupon_unavailable/)
    })
  })

  describe('pagamento (webhook do Mercado Pago)', () => {
    const apply = (id: string, status: string, amount: number | null, detail: string | null = null) =>
      as(db, 'service_role', null, async () => (await db.query('select public.apply_payment($1,$2,$3,$4,$5) as r', [id, status, 'MP-1', amount, detail])).rows[0].r, true)
    const statusOf = async (id: string) => (await db.query('select status from orders where id = $1', [id])).rows[0].status as string

    it('aprovado → pago; repetir a notificação não duplica nada', async () => {
      const id = await place(ana, [item('avental', 1)], orderPayload(ana, 100))
      expect(await apply(id, 'approved', 100)).toMatchObject({ status: 'pago', changed: true })
      expect(await apply(id, 'approved', 100)).toMatchObject({ status: 'pago', changed: false })
      const events = (await db.query(`select count(*)::int as n from order_events where order_id = $1 and status = 'pago'`, [id])).rows[0].n
      expect(events).toBe(1)
      expect((await db.query('select paid_at, expires_at, payment from orders where id = $1', [id])).rows[0]).toMatchObject({ expires_at: null, payment: { mpId: 'MP-1', mpStatus: 'approved' } })
    })

    it('valor diferente do pedido NÃO marca como pago', async () => {
      const id = await place(ana, [item('avental', 1)], orderPayload(ana, 100))
      await expect(apply(id, 'approved', 1)).rejects.toThrow(/amount_mismatch/)
      expect(await statusOf(id)).toBe('aguardando')
    })

    it('recusado/expirado cancela e devolve o estoque e o cupom', async () => {
      await db.query(`insert into coupons (code, label, percent) values ('DEVOLVE', 'Devolve', 0.1)`)
      const before = await stock('avental')
      const id = await place(ana, [item('avental', 2)], orderPayload(ana, 180, { coupon: 'DEVOLVE', discount: 20 }))
      expect(await stock('avental')).toBe(before - 2)
      expect(await apply(id, 'rejected', null, 'cc_rejected_insufficient_amount')).toMatchObject({ status: 'cancelado', changed: true })
      expect(await stock('avental')).toBe(before)
      expect((await db.query(`select uses from coupons where code = 'DEVOLVE'`)).rows[0].uses).toBe(0)
      // repetir não devolve de novo
      await apply(id, 'rejected', null)
      expect(await stock('avental')).toBe(before)
    })

    it('Pix pago depois do cancelamento pede estorno e não ressuscita o pedido', async () => {
      const id = await place(ana, [item('avental', 1)], orderPayload(ana, 100))
      await as(db, 'service_role', null, () => db.query('select public.cancel_order($1, $2)', [id, 'vencido']), true)
      expect(await apply(id, 'approved', 100)).toMatchObject({ status: 'cancelado', refundNeeded: true })
    })

    it('estorno/chargeback cancela o pedido', async () => {
      const id = await place(ana, [item('digital')], orderPayload(ana, 100))
      await apply(id, 'approved', 100)
      expect(await apply(id, 'refunded', 100)).toMatchObject({ status: 'cancelado' })
    })
  })

  describe('painel: mudança de status', () => {
    const setStatus = (id: string, status: string, note: string | null = null, tracking: string | null = null) =>
      as(db, 'service_role', null, async () => (await db.query('select public.admin_set_status($1,$2,$3,$4,$5) as r', [id, status, note, tracking, admin])).rows[0].r, true)

    it('segue o fluxo pago → produção → enviado (com rastreio) → entregue', async () => {
      const id = await place(ana, [item('digital')], orderPayload(ana, 100))
      await setStatus(id, 'pago')
      await setStatus(id, 'producao')
      await setStatus(id, 'enviado', null, 'PC123456789BR')
      expect((await db.query('select status, tracking from orders where id = $1', [id])).rows[0]).toEqual({ status: 'enviado', tracking: 'PC123456789BR' })
      await setStatus(id, 'entregue')
      const ev = (await db.query('select status from order_events where order_id = $1 order by id', [id])).rows.map((r) => r.status)
      expect(ev).toEqual(['aguardando', 'pago', 'producao', 'enviado', 'entregue'])
    })

    it('não anda para trás, não cancela depois de enviado e não mexe em pedido encerrado', async () => {
      const id = await place(ana, [item('digital')], orderPayload(ana, 100))
      await setStatus(id, 'pago')
      await setStatus(id, 'enviado', null, 'X1')
      await expect(setStatus(id, 'producao')).rejects.toThrow(/invalid_transition/)
      await expect(setStatus(id, 'cancelado')).rejects.toThrow(/invalid_transition/)
      await setStatus(id, 'entregue')
      await expect(setStatus(id, 'pago')).rejects.toThrow(/invalid_transition/)
    })

    it('cancelar pelo painel devolve o estoque', async () => {
      const before = await stock('avental')
      const id = await place(ana, [item('avental', 3)], orderPayload(ana, 300))
      await setStatus(id, 'pago')
      await setStatus(id, 'cancelado', 'Cliente desistiu')
      expect(await stock('avental')).toBe(before)
    })

    it('só o servidor executa (cliente e admin logado no navegador não)', async () => {
      const id = await place(ana, [item('digital')])
      await expect(as(db, 'authenticated', admin, () => db.query(`select public.admin_set_status($1,'pago',null,null,null)`, [id]))).rejects.toThrow(/permission denied/)
      const r = await as(db, 'authenticated', admin, () => db.query(`update orders set status = 'pago' where id = $1`, [id])).catch((e) => e)
      expect(String(r)).toMatch(/permission denied/)
    })
  })

  describe('vencimento automático', () => {
    it('cancela só os pedidos vencidos e devolve o estoque', async () => {
      const before = await stock('avental')
      const vencido = await place(ana, [item('avental', 1)], orderPayload(ana, 100, { expires_at: new Date(Date.now() - 60_000).toISOString() }))
      const valido = await place(ana, [item('avental', 1)], orderPayload(ana, 100))
      const pago = await place(ana, [item('digital')], orderPayload(ana, 100, { expires_at: new Date(Date.now() - 60_000).toISOString() }))
      await as(db, 'service_role', null, () => db.query(`select public.apply_payment($1,'approved','m',100)`, [pago]), true)
      const n = await as(db, 'service_role', null, async () => (await db.query('select public.expire_unpaid_orders() as n')).rows[0].n, true)
      expect(n).toBeGreaterThanOrEqual(1)
      const st = async (id: string) => (await db.query('select status from orders where id = $1', [id])).rows[0].status
      expect(await st(vencido)).toBe('cancelado')
      expect(await st(valido)).toBe('aguardando')
      expect(await st(pago)).toBe('pago')
      expect(await stock('avental')).toBe(before - 1) // só o pedido válido segue reservando
    })
  })

  describe('arquivos (storage)', () => {
    const put = (bucket: string, path: string) => db.query(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, path])

    it('cliente envia só para a própria pasta e ninguém mais lê', async () => {
      await as(db, 'authenticated', ana, () => put('order-uploads', `${ana}/foto.jpg`), true)
      await expect(as(db, 'authenticated', ana, () => put('order-uploads', `${bia}/foto.jpg`))).rejects.toThrow(/row-level security/)
      const bias = await as(db, 'authenticated', bia, async () => (await db.query(`select name from storage.objects where bucket_id = 'order-uploads'`)).rows)
      expect(bias).toHaveLength(0)
      const adm = await as(db, 'authenticated', admin, async () => (await db.query(`select name from storage.objects where bucket_id = 'order-uploads'`)).rows)
      expect(adm.map((r) => r.name)).toContain(`${ana}/foto.jpg`)
      const anon = await as(db, 'anon', null, async () => (await db.query(`select name from storage.objects where bucket_id = 'order-uploads'`)).rows)
      expect(anon).toHaveLength(0)
    })

    it('fotos de produto: todos leem, só admin envia', async () => {
      await as(db, 'authenticated', admin, () => put('product-images', 'p01/1.jpg'), true)
      const anon = await as(db, 'anon', null, async () => (await db.query(`select name from storage.objects where bucket_id = 'product-images'`)).rows)
      expect(anon).toHaveLength(1)
      await expect(as(db, 'authenticated', ana, () => put('product-images', 'p01/2.jpg'))).rejects.toThrow(/row-level security/)
    })

    it('limites dos buckets: STL até 50 MB (privado), fotos de produto até 5 MB (público)', async () => {
      const { rows } = await db.query(`select id, public, file_size_limit from storage.buckets order by id`)
      expect(rows).toEqual([
        { id: 'order-uploads', public: false, file_size_limit: '52428800' },
        { id: 'product-images', public: true, file_size_limit: '5242880' },
      ])
    })
  })
})
