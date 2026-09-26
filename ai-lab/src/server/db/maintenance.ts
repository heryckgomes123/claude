import { sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PgDatabase<PgQueryResultHKT, any, any>

/**
 * Recalcula `search_keywords` (tags + ferramentas + categoria) de itens de conteúdo.
 * A coluna gerada `search` é atualizada automaticamente pelo Postgres.
 * Sem dependência de `server-only`: usado pela aplicação e pelos scripts de seed/importação.
 */
export async function refreshSearchKeywords(db: AnyDb, contentIds?: string[]) {
  const scope =
    contentIds && contentIds.length
      ? sql`where ci.id in (${sql.join(
          contentIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`
      : sql``
  await db.execute(sql`
    update content_item ci set search_keywords = trim(concat_ws(' ',
      (select string_agg(t.name, ' ') from content_tag ct join tag t on t.id = ct.tag_id where ct.content_id = ci.id),
      (select string_agg(ti.title, ' ') from content_relation cr join content_item ti on ti.id = cr.to_id
         where cr.from_id = ci.id and cr.kind in ('COMPATIBLE_TOOL', 'REQUIRED_TOOL', 'OPTIONAL_TOOL')),
      (select c.name from category c where c.id = ci.category_id)
    ))
    ${scope}
  `)
}
