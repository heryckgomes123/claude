// Gera supabase/seed.sql com o catálogo de src/data/seedProducts.ts.
//   node scripts/seed-sql.mjs   →  depois: psql "$DB_URL" -f supabase/seed.sql  (ou cole no SQL Editor do Supabase)
// "on conflict do nothing": rodar de novo não sobrescreve produtos editados no painel.
import { writeFileSync } from 'node:fs'
import { runnerImport } from 'vite'

const { SEED_PRODUCTS } = (await runnerImport('/src/data/seedProducts.ts')).module
const { productToRow } = (await runnerImport('/src/api/mapping.ts')).module

const lit = (v) => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return `'${String(v).replace(/'/g, "''")}'`
}
const textArray = (a) => `array[${a.map(lit).join(', ')}]::text[]`
const jsonCols = new Set(['description', 'highlights', 'specs', 'options', 'personalization', 'photo_upload'])

const rows = SEED_PRODUCTS.map((p, i) => ({ id: p.id, ...productToRow(p), active: p.active ?? true, sort: (i + 1) * 10 }))
const cols = [...new Set(rows.flatMap(Object.keys))]
const value = (row, c) => {
  const v = row[c]
  if (v === undefined) return 'default'
  if (jsonCols.has(c)) return v === null ? 'null' : `${lit(JSON.stringify(v))}::jsonb`
  if (c === 'tags' || c === 'images') return textArray(v ?? [])
  return lit(v)
}

const sql = `-- Gerado por scripts/seed-sql.mjs a partir de src/data/seedProducts.ts — não edite à mão.
-- ${rows.length} produtos. Seguro rodar mais de uma vez.
insert into public.products (${cols.join(', ')}) values
${rows.map((r) => `  (${cols.map((c) => value(r, c)).join(', ')})`).join(',\n')}
on conflict (id) do nothing;
`
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql)
console.log(`supabase/seed.sql: ${rows.length} produtos`)
