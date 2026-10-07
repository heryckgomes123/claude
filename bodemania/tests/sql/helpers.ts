import { readdirSync, readFileSync } from 'node:fs'
import pg from 'pg'

const ADMIN_URL = process.env.TEST_DATABASE_URL
export const hasDb = !!ADMIN_URL

export type Role = 'anon' | 'authenticated' | 'service_role'

export async function createTestDb() {
  const admin = new pg.Client({ connectionString: ADMIN_URL })
  await admin.connect()
  const name = 'bm_' + Math.random().toString(36).slice(2, 10)
  await admin.query(`create database ${name}`)
  await admin.end()

  const url = new URL(ADMIN_URL!)
  url.pathname = '/' + name
  const db = new pg.Client({ connectionString: url.toString() })
  await db.connect()
  await db.query(readFileSync('supabase/tests/00_mock_supabase.sql', 'utf8'))
  const files = readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql') && !f.includes('cron'))
    .sort()
  for (const f of files) await db.query(readFileSync(`supabase/migrations/${f}`, 'utf8'))

  return {
    db,
    async drop() {
      await db.end()
      const a = new pg.Client({ connectionString: ADMIN_URL })
      await a.connect()
      await a.query(`drop database if exists ${name} with (force)`)
      await a.end()
    },
  }
}

/** Executa `fn` como se fosse o PostgREST: papel + usuário do JWT. Faz rollback, a menos que commit=true. */
export async function as<T>(db: pg.Client, role: Role, uid: string | null, fn: () => Promise<T>, commit = false): Promise<T> {
  await db.query('begin')
  try {
    await db.query(`set local role ${role}`)
    if (uid) await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid])
    const result = await fn()
    await db.query(commit ? 'commit' : 'rollback')
    return result
  } catch (e) {
    await db.query('rollback')
    throw e
  }
}

export async function newUser(db: pg.Client, email: string, meta: Record<string, unknown> = {}, role: 'customer' | 'admin' = 'customer') {
  const { rows } = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, meta])
  const id = rows[0].id as string
  if (role === 'admin') await db.query(`update public.profiles set role = 'admin' where id = $1`, [id])
  return id
}

export async function newProduct(db: pg.Client, id: string, over: Record<string, unknown> = {}) {
  const p = { slug: id, name: `Produto ${id}`, category: 'aventais', price: 100, stock: 5, active: true, ...over }
  await db.query(
    `insert into public.products (id, slug, name, category, price, stock, active, kind, weight)
     values ($1, $2, $3, $4, $5, $6, $7, 'physical', 0.5)`,
    [id, p.slug, p.name, p.category, p.price, p.stock, p.active],
  )
}

export function orderPayload(userId: string, total = 200, extra: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    subtotal: total,
    discount: 0,
    pix_discount: 0,
    shipping: 0,
    total,
    payment: { method: 'pix' },
    customer: { name: 'Ana Souza', email: 'ana@exemplo.com', cpf: '52998224725', phone: '11987654321' },
    address: null,
    shipping_option: { id: 'pac', label: 'Correios PAC', price: 0, days: 5 },
    lead_days: 3,
    estimate: new Date(Date.now() + 5 * 864e5).toISOString(),
    digital_only: false,
    expires_at: new Date(Date.now() + 30 * 60e3).toISOString(),
    ...extra,
  }
}

export const item = (productId: string, qty = 1, unit = 100) => ({
  product_id: productId,
  name: `Produto ${productId}`,
  unit_price: unit,
  qty,
  variant: ['Rito: REAA'],
  art: 'avental',
  universe: 'maconaria',
  kind: 'physical',
})
