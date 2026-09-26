import 'server-only'
import { sql } from 'drizzle-orm'
import { CONTENT_TYPES, type ContentType } from '@/lib/labels'
import { HIGHLIGHT_END, HIGHLIGHT_START, prefixTsQuery, searchTokens, unaccent } from '@/lib/search-query'
import { db } from '../../db'
import type { SearchOptions, SearchProvider, SearchResult } from './types'

type Row = {
  id: string
  type: ContentType
  slug: string
  title: string
  summary: string
  category_name: string | null
  highlight: string | null
  score: number
}

const HEADLINE_OPTIONS = `StartSel=${HIGHLIGHT_START}, StopSel=${HIGHLIGHT_END}, MaxWords=26, MinWords=12, ShortWord=2, HighlightAll=false`

export class PostgresSearchProvider implements SearchProvider {
  readonly name = 'postgres-fts'

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50)
    const types = (options.types ?? []).filter((t) => (CONTENT_TYPES as readonly string[]).includes(t))
    const tokens = searchTokens(query)
    if (tokens.length === 0) return []

    let rows = await this.fullText(prefixTsQuery(query, 'and')!, types, limit)
    // Poucos resultados com todos os termos: completa com correspondências parciais, ranqueadas depois.
    if (rows.length < Math.min(6, limit) && tokens.length > 1) {
      const seen = new Set(rows.map((r) => r.id))
      const partial = await this.fullText(prefixTsQuery(query, 'or')!, types, limit)
      rows = [...rows, ...partial.filter((r) => !seen.has(r.id)).map((r) => ({ ...r, score: r.score * 0.5 }))].slice(0, limit)
    }
    if (rows.length === 0) rows = await this.fuzzy(query, types, limit)

    return this.withReasons(rows, tokens)
  }

  private typeFilter(types: ContentType[]) {
    if (types.length === 0) return sql``
    return sql`and ci.type in (${sql.join(
      types.map((t) => sql`${t}::content_type`),
      sql`, `,
    )})`
  }

  private async fullText(tsquery: string, types: ContentType[], limit: number): Promise<Row[]> {
    return db.execute<Row>(sql`
      select ci.id, ci.type, ci.slug, ci.title, ci.summary, c.name as category_name,
        ts_headline('portuguese', ci.summary || ' ' || ci.description, q, ${HEADLINE_OPTIONS}) as highlight,
        (ts_rank_cd(ci.search, q, 32) + least(ci.favorite_count, 50) * 0.002 + case when ci.featured then 0.02 else 0 end)::float as score
      from content_item ci
      left join category c on c.id = ci.category_id
      cross join to_tsquery('portuguese', ${tsquery}) q
      where ci.status = 'PUBLISHED' and ci.search @@ q ${this.typeFilter(types)}
      order by score desc, ci.published_at desc nulls last
      limit ${limit}
    `)
  }

  private async fuzzy(query: string, types: ContentType[], limit: number): Promise<Row[]> {
    const q = unaccent(query.toLowerCase()).slice(0, 120)
    return db.execute<Row>(sql`
      select ci.id, ci.type, ci.slug, ci.title, ci.summary, c.name as category_name, null as highlight,
        word_similarity(${q}, intelra_unaccent(lower(ci.title)))::float as score
      from content_item ci
      left join category c on c.id = ci.category_id
      where ci.status = 'PUBLISHED' ${this.typeFilter(types)}
        and word_similarity(${q}, intelra_unaccent(lower(ci.title))) > 0.35
      order by score desc
      limit ${limit}
    `)
  }

  private async withReasons(rows: Row[], tokens: string[]): Promise<SearchResult[]> {
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    const tagRows = await db.execute<{ content_id: string; name: string; slug: string }>(sql`
      select ct.content_id, t.name, t.slug from content_tag ct join tag t on t.id = ct.tag_id
      where ct.content_id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})
    `)
    const toolRows = await db.execute<{ from_id: string; title: string }>(sql`
      select cr.from_id, ci.title from content_relation cr join content_item ci on ci.id = cr.to_id
      where cr.kind in ('COMPATIBLE_TOOL', 'REQUIRED_TOOL', 'OPTIONAL_TOOL')
        and cr.from_id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})
    `)
    const hits = (text: string) => {
      const normalized = unaccent(text.toLowerCase())
      return tokens.some((t) => normalized.split(/[^a-z0-9]+/).some((w) => w.startsWith(t)))
    }

    return rows.map((row) => {
      const reasons: string[] = []
      if (hits(row.title)) reasons.push('O título corresponde à sua busca')
      const tags = tagRows.filter((t) => t.content_id === row.id && hits(`${t.name} ${t.slug}`)).map((t) => t.name)
      if (tags.length) reasons.push(`Tags: ${tags.slice(0, 3).join(', ')}`)
      const tools = toolRows.filter((t) => t.from_id === row.id && hits(t.title)).map((t) => t.title)
      if (tools.length) reasons.push(`Usa ${tools.slice(0, 2).join(', ')}`)
      if (row.category_name && hits(row.category_name)) reasons.push(`Categoria ${row.category_name}`)
      if (reasons.length === 0) reasons.push(row.highlight ? 'Mencionado na descrição' : 'Título semelhante')
      const highlight = row.highlight && row.highlight.includes(HIGHLIGHT_START) ? row.highlight : null
      return {
        id: row.id,
        type: row.type,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        categoryName: row.category_name,
        highlight,
        reasons,
        score: Number(row.score),
      }
    })
  }
}

let provider: SearchProvider | undefined
export function getSearchProvider(): SearchProvider {
  provider ??= new PostgresSearchProvider()
  return provider
}
