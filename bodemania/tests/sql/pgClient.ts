import type pg from 'pg'
import type { Db } from '../../supabase/functions/_shared/server/supabaseRepo.ts'

/**
 * Cliente "estilo supabase-js" que fala direto com o Postgres de teste.
 * Chama as funções com parâmetros NOMEADOS (como o PostgREST faz), então erra se um nome estiver trocado,
 * e devolve JSON como o PostgREST (números como número).
 */
export function pgSupabase(db: pg.Client): Db {
  const wrapErr = (e: any) => ({ data: null, error: { message: e.message as string, details: e.detail as string | undefined } })

  return {
    async rpc(name, params) {
      const keys = Object.keys(params)
      const sql = `select to_jsonb(public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})) as r`
      const values = keys.map((k) => (typeof params[k] === 'object' && params[k] !== null ? JSON.stringify(params[k]) : params[k]))
      try {
        const { rows } = await db.query(sql, values)
        return { data: rows[0].r, error: null }
      } catch (e) {
        return wrapErr(e)
      }
    },
    from(table: string) {
      const filters: { sql: string; value: unknown }[] = []
      let embedItems = false
      const builder: any = {
        select(cols: string) {
          embedItems = cols.includes('items:order_items')
          return builder
        },
        eq(col: string, value: unknown) {
          const sqlCol = col.includes('->>') ? col.replace(/^(\w+)->>(\w+)$/, "t.$1->>'$2'") : `t.${col}`
          filters.push({ sql: `${sqlCol} = $#`, value })
          return builder
        },
        neq(col: string, value: unknown) {
          filters.push({ sql: `t.${col} <> $#`, value })
          return builder
        },
        in(col: string, values: unknown[]) {
          filters.push({ sql: `t.${col} = any($#)`, value: values })
          return builder
        },
        async run() {
          const where = filters.map((f, i) => f.sql.replace('$#', `$${i + 1}`)).join(' and ') || 'true'
          const base = embedItems
            ? `(select o.*, coalesce((select jsonb_agg(jsonb_build_object('product_id', i.product_id, 'name', i.name, 'unit_price', i.unit_price, 'qty', i.qty, 'variant', i.variant, 'personalization', i.personalization)) from public.order_items i where i.order_id = o.id), '[]'::jsonb) as items from public.${table} o)`
            : `public.${table}`
          try {
            const { rows } = await db.query(`select to_jsonb(t) as r from ${base} t where ${where}`, filters.map((f) => f.value))
            return { data: rows.map((r) => r.r), error: null }
          } catch (e) {
            return wrapErr(e)
          }
        },
        async maybeSingle() {
          const res = await builder.run()
          return res.error ? res : { data: res.data[0] ?? null, error: null }
        },
        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
          return builder.run().then(resolve, reject)
        },
      }
      return builder
    },
  }
}
