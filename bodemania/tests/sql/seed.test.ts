import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { as, createTestDb, hasDb } from './helpers.ts'
import { SEED_PRODUCTS } from '../../src/data/seedProducts.ts'
import { productFromRow } from '../../src/api/mapping.ts'

describe.skipIf(!hasDb)('supabase/seed.sql', () => {
  let db: pg.Client
  let drop: () => Promise<void>
  const seed = readFileSync('supabase/seed.sql', 'utf8')

  beforeAll(async () => {
    const t = await createTestDb()
    db = t.db
    drop = t.drop
    await db.query(seed)
  })
  afterAll(async () => drop?.())

  it('visitante anônimo enxerga todo o catálogo (seed.sql em dia com seedProducts.ts)', async () => {
    const { rows } = await as(db, 'anon', null, () => db.query('select * from products order by sort'))
    expect(rows.map((r) => r.id)).toEqual(SEED_PRODUCTS.map((p) => p.id))
  })

  it('cada produto volta do banco igual ao catálogo do site', async () => {
    const { rows } = await db.query('select * from products')
    for (const p of SEED_PRODUCTS) {
      const back = productFromRow(rows.find((r) => r.id === p.id)!)
      expect(back).toMatchObject({
        slug: p.slug, name: p.name, category: p.category, price: p.price, kind: p.kind, short: p.short,
        description: p.description, specs: p.specs, tags: p.tags ?? [], options: p.options, active: true,
      })
      if (p.compareAt !== undefined) expect(back.compareAt).toBe(p.compareAt)
      if (p.stock !== undefined) expect(back.stock).toBe(p.stock)
    }
  })

  it('rodar de novo não duplica nem sobrescreve edições do painel', async () => {
    await db.query(`update products set price = 1 where id = $1`, [SEED_PRODUCTS[0].id])
    await db.query(seed)
    const { rows } = await db.query('select count(*)::int as n, min(price) as min from products')
    expect(rows[0].n).toBe(SEED_PRODUCTS.length)
    expect(Number(rows[0].min)).toBe(1)
  })
})
