import 'server-only'
import { and, asc, desc, eq, exists, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { ContentType, Difficulty, MediaType, PricingStatus, SortKey, TimeBucket, VerificationStatus } from '@/lib/labels'
import { prefixTsQuery, unaccent } from '@/lib/search-query'
import { db } from '../db'
import {
  category,
  contentItem,
  contentRelation,
  contentTag,
  favorite,
  prompt,
  reference,
  tag,
  tool,
  tutorial,
  workflow,
} from '../db/schema'

export const PAGE_SIZE = 24
const TOOL_KINDS = ['COMPATIBLE_TOOL', 'REQUIRED_TOOL', 'OPTIONAL_TOOL'] as const

export type ContentCard = {
  id: string
  type: ContentType
  slug: string
  title: string
  summary: string
  coverImageUrl: string | null
  difficulty: Difficulty | null
  featured: boolean
  publishedAt: Date | null
  useCount: number
  favoriteCount: number
  category: { name: string; slug: string; icon: string | null } | null
  tags: { name: string; slug: string }[]
  tools: { title: string; slug: string }[]
  isFavorite: boolean
  mediaType: MediaType | null
  estimatedMinutes: number | null
  pricingStatus: PricingStatus | null
  verificationStatus: VerificationStatus | null
  palette: string[] | null
  aspectRatio: string | null
  requiredEntitlement: string | null
}

export type ListParams = {
  type: ContentType
  q?: string
  category?: string
  tag?: string
  tool?: string
  difficulty?: Difficulty
  media?: MediaType
  pricing?: PricingStatus
  time?: TimeBucket
  sort?: SortKey
  page?: number
  pageSize?: number
  /** Restringe a ids (ex.: favoritos). */
  ids?: string[]
  featuredOnly?: boolean
}

/* -------------------------------------------------------------------------- */
/* Seleção base de cards                                                      */
/* -------------------------------------------------------------------------- */

function cardSelection() {
  return {
    id: contentItem.id,
    type: contentItem.type,
    slug: contentItem.slug,
    title: contentItem.title,
    summary: contentItem.summary,
    coverImageUrl: contentItem.coverImageUrl,
    difficulty: contentItem.difficulty,
    featured: contentItem.featured,
    publishedAt: contentItem.publishedAt,
    useCount: contentItem.useCount,
    favoriteCount: contentItem.favoriteCount,
    requiredEntitlement: contentItem.requiredEntitlement,
    categoryName: category.name,
    categorySlug: category.slug,
    categoryIcon: category.icon,
    mediaType: prompt.mediaType,
    workflowMinutes: workflow.estimatedMinutes,
    tutorialMinutes: tutorial.estimatedMinutes,
    pricingStatus: tool.pricingStatus,
    verificationStatus: tool.verificationStatus,
    palette: reference.palette,
    aspectRatio: sql<string | null>`coalesce(${reference.aspectRatio}, ${prompt.aspectRatio})`,
  }
}

type CardRow = Awaited<ReturnType<typeof baseCardQuery>>[number]

function baseCardQuery() {
  return db
    .select(cardSelection())
    .from(contentItem)
    .leftJoin(category, eq(category.id, contentItem.categoryId))
    .leftJoin(prompt, eq(prompt.contentId, contentItem.id))
    .leftJoin(workflow, eq(workflow.contentId, contentItem.id))
    .leftJoin(tutorial, eq(tutorial.contentId, contentItem.id))
    .leftJoin(tool, eq(tool.contentId, contentItem.id))
    .leftJoin(reference, eq(reference.contentId, contentItem.id))
}

/** Completa cards com tags, ferramentas e estado de favorito em 3 consultas (sem N+1). */
export async function hydrateCards(rows: CardRow[], userId: string | null): Promise<ContentCard[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const toolItem = alias(contentItem, 'tool_item')

  const [tagRows, toolRows, favRows] = await Promise.all([
    db
      .select({ contentId: contentTag.contentId, name: tag.name, slug: tag.slug })
      .from(contentTag)
      .innerJoin(tag, eq(tag.id, contentTag.tagId))
      .where(inArray(contentTag.contentId, ids))
      .orderBy(asc(tag.name)),
    db
      .select({ fromId: contentRelation.fromId, title: toolItem.title, slug: toolItem.slug, kind: contentRelation.kind })
      .from(contentRelation)
      .innerJoin(toolItem, eq(toolItem.id, contentRelation.toId))
      .where(
        and(
          inArray(contentRelation.fromId, ids),
          inArray(contentRelation.kind, [...TOOL_KINDS]),
          eq(toolItem.status, 'PUBLISHED'),
        ),
      )
      .orderBy(asc(contentRelation.kind), asc(contentRelation.sortOrder)),
    userId
      ? db
          .select({ contentId: favorite.contentId })
          .from(favorite)
          .where(and(eq(favorite.userId, userId), inArray(favorite.contentId, ids)))
      : Promise.resolve([] as { contentId: string }[]),
  ])

  const favs = new Set(favRows.map((f) => f.contentId))
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    coverImageUrl: r.coverImageUrl,
    difficulty: r.difficulty,
    featured: r.featured,
    publishedAt: r.publishedAt,
    useCount: r.useCount,
    favoriteCount: r.favoriteCount,
    requiredEntitlement: r.requiredEntitlement,
    category: r.categoryName ? { name: r.categoryName, slug: r.categorySlug!, icon: r.categoryIcon } : null,
    tags: tagRows.filter((t) => t.contentId === r.id).map(({ name, slug }) => ({ name, slug })),
    tools: toolRows.filter((t) => t.fromId === r.id).map(({ title, slug }) => ({ title, slug })),
    isFavorite: favs.has(r.id),
    mediaType: r.mediaType,
    estimatedMinutes: r.workflowMinutes ?? r.tutorialMinutes ?? null,
    pricingStatus: r.pricingStatus,
    verificationStatus: r.verificationStatus,
    palette: r.palette,
    aspectRatio: r.aspectRatio,
  }))
}

/* -------------------------------------------------------------------------- */
/* Listagens com filtros                                                      */
/* -------------------------------------------------------------------------- */

export function textSearchCondition(q: string): SQL | undefined {
  const tsquery = prefixTsQuery(q)
  const plain = unaccent(q.trim().toLowerCase()).slice(0, 120)
  if (!plain) return undefined
  const like = `%${plain.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
  const titleLike = sql`intelra_unaccent(lower(${contentItem.title})) like ${like}`
  return tsquery ? or(sql`${contentItem.search} @@ to_tsquery('portuguese', ${tsquery})`, titleLike) : titleLike
}

function toolCondition(toolSlug: string) {
  const toolItem = alias(contentItem, 'filter_tool')
  return exists(
    db
      .select({ one: sql`1` })
      .from(contentRelation)
      .innerJoin(toolItem, eq(toolItem.id, contentRelation.toId))
      .where(
        and(
          eq(contentRelation.fromId, contentItem.id),
          inArray(contentRelation.kind, [...TOOL_KINDS]),
          eq(toolItem.type, 'TOOL'),
          eq(toolItem.slug, toolSlug),
        ),
      ),
  )
}

function timeCondition(bucket: TimeBucket) {
  const minutes = sql`coalesce(${workflow.estimatedMinutes}, ${tutorial.estimatedMinutes})`
  if (bucket === 'short') return sql`${minutes} <= 30`
  if (bucket === 'medium') return sql`${minutes} > 30 and ${minutes} <= 60`
  return sql`${minutes} > 60`
}

function sortOrder(sort: SortKey | undefined) {
  switch (sort) {
    case 'used':
      return [desc(contentItem.useCount), desc(contentItem.publishedAt)]
    case 'popular':
      return [desc(sql`${contentItem.favoriteCount} * 3 + ${contentItem.viewCount}`), desc(contentItem.publishedAt)]
    case 'az':
      return [asc(sql`lower(${contentItem.title})`)]
    default:
      return [desc(contentItem.featured), desc(contentItem.publishedAt), asc(contentItem.title)]
  }
}

export async function listContent(params: ListParams, userId: string | null) {
  const pageSize = Math.min(params.pageSize ?? PAGE_SIZE, 60)
  const page = Math.max(1, Math.min(params.page ?? 1, 500))

  const conditions: (SQL | undefined)[] = [eq(contentItem.type, params.type), eq(contentItem.status, 'PUBLISHED')]
  if (params.q) conditions.push(textSearchCondition(params.q))
  if (params.category) conditions.push(eq(category.slug, params.category))
  if (params.difficulty) conditions.push(eq(contentItem.difficulty, params.difficulty))
  if (params.featuredOnly) conditions.push(eq(contentItem.featured, true))
  if (params.ids) conditions.push(params.ids.length ? inArray(contentItem.id, params.ids) : sql`false`)
  if (params.tag)
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(contentTag)
          .innerJoin(tag, eq(tag.id, contentTag.tagId))
          .where(and(eq(contentTag.contentId, contentItem.id), eq(tag.slug, params.tag))),
      ),
    )
  if (params.tool && params.type !== 'TOOL') conditions.push(toolCondition(params.tool))
  if (params.media && params.type === 'PROMPT') conditions.push(eq(prompt.mediaType, params.media))
  if (params.media && params.type === 'TOOL') conditions.push(sql`${params.media}::media_type = any(${tool.supportedMedia})`)
  if (params.pricing && params.type === 'TOOL') conditions.push(eq(tool.pricingStatus, params.pricing))
  if (params.time && (params.type === 'WORKFLOW' || params.type === 'TUTORIAL')) conditions.push(timeCondition(params.time))

  const where = and(...conditions)

  const [rows, [{ total }]] = await Promise.all([
    baseCardQuery()
      .where(where)
      .orderBy(...sortOrder(params.sort))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(contentItem)
      .leftJoin(category, eq(category.id, contentItem.categoryId))
      .leftJoin(prompt, eq(prompt.contentId, contentItem.id))
      .leftJoin(workflow, eq(workflow.contentId, contentItem.id))
      .leftJoin(tutorial, eq(tutorial.contentId, contentItem.id))
      .leftJoin(tool, eq(tool.contentId, contentItem.id))
      .where(where),
  ])

  return {
    items: await hydrateCards(rows, userId),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/** Cards por ids, preservando a ordem recebida. Apenas conteúdo publicado. */
export async function getCardsByIds(ids: string[], userId: string | null): Promise<ContentCard[]> {
  if (ids.length === 0) return []
  const rows = await baseCardQuery().where(and(inArray(contentItem.id, ids), eq(contentItem.status, 'PUBLISHED')))
  const cards = await hydrateCards(rows, userId)
  const byId = new Map(cards.map((c) => [c.id, c]))
  return ids.map((id) => byId.get(id)).filter((c): c is ContentCard => Boolean(c))
}

/* -------------------------------------------------------------------------- */
/* Opções de filtros (sempre derivadas do banco)                              */
/* -------------------------------------------------------------------------- */

export async function getFilterOptions(type: ContentType) {
  const kind = type === 'TOOL' ? 'TOOL' : 'CONTENT'
  const toolItem = alias(contentItem, 'opt_tool')

  const [categories, tags, tools] = await Promise.all([
    db
      .select({ slug: category.slug, name: category.name, count: sql<number>`count(${contentItem.id})::int` })
      .from(category)
      .innerJoin(
        contentItem,
        and(eq(contentItem.categoryId, category.id), eq(contentItem.type, type), eq(contentItem.status, 'PUBLISHED')),
      )
      .where(eq(category.kind, kind))
      .groupBy(category.id)
      .orderBy(asc(category.sortOrder), asc(category.name)),
    db
      .select({ slug: tag.slug, name: tag.name, count: sql<number>`count(*)::int` })
      .from(tag)
      .innerJoin(contentTag, eq(contentTag.tagId, tag.id))
      .innerJoin(
        contentItem,
        and(eq(contentItem.id, contentTag.contentId), eq(contentItem.type, type), eq(contentItem.status, 'PUBLISHED')),
      )
      .groupBy(tag.id)
      .orderBy(desc(sql`count(*)`), asc(tag.name))
      .limit(40),
    type === 'TOOL'
      ? Promise.resolve([] as { slug: string; title: string }[])
      : db
          .selectDistinct({ slug: toolItem.slug, title: toolItem.title })
          .from(contentRelation)
          .innerJoin(toolItem, and(eq(toolItem.id, contentRelation.toId), eq(toolItem.status, 'PUBLISHED')))
          .innerJoin(
            contentItem,
            and(eq(contentItem.id, contentRelation.fromId), eq(contentItem.type, type), eq(contentItem.status, 'PUBLISHED')),
          )
          .where(inArray(contentRelation.kind, [...TOOL_KINDS]))
          .orderBy(asc(toolItem.title)),
  ])
  return { categories, tags, tools }
}

/* -------------------------------------------------------------------------- */
/* Detalhe                                                                    */
/* -------------------------------------------------------------------------- */

export async function getContentMeta(type: ContentType, slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const [row] = await db
    .select({
      item: contentItem,
      category: { name: category.name, slug: category.slug, icon: category.icon },
    })
    .from(contentItem)
    .leftJoin(category, eq(category.id, contentItem.categoryId))
    .where(
      and(
        eq(contentItem.type, type),
        eq(contentItem.slug, slug),
        opts.includeUnpublished ? undefined : eq(contentItem.status, 'PUBLISHED'),
      ),
    )
    .limit(1)
  if (!row) return null
  const tags = await db
    .select({ name: tag.name, slug: tag.slug })
    .from(contentTag)
    .innerJoin(tag, eq(tag.id, contentTag.tagId))
    .where(eq(contentTag.contentId, row.item.id))
    .orderBy(asc(tag.name))
  return { ...row.item, category: row.category?.name ? row.category : null, tags }
}

export type ContentMeta = NonNullable<Awaited<ReturnType<typeof getContentMeta>>>

export type RelatedItem = {
  id: string
  type: ContentType
  slug: string
  title: string
  summary: string
  kind: 'RELATED' | 'COMPATIBLE_TOOL' | 'REQUIRED_TOOL' | 'OPTIONAL_TOOL'
  direction: 'out' | 'in'
  difficulty: Difficulty | null
  categoryName: string | null
}

/**
 * Vizinhos no grafo de conhecimento: relações de saída (ferramentas usadas, relacionados)
 * e de entrada (quem usa esta ferramenta / quem aponta para este conteúdo). Apenas publicados.
 */
export async function getRelated(contentId: string): Promise<RelatedItem[]> {
  const other = alias(contentItem, 'other')
  const cat = alias(category, 'other_cat')
  const select = {
    id: other.id,
    type: other.type,
    slug: other.slug,
    title: other.title,
    summary: other.summary,
    difficulty: other.difficulty,
    kind: contentRelation.kind,
    sortOrder: contentRelation.sortOrder,
    categoryName: cat.name,
  }
  const [outgoing, incoming] = await Promise.all([
    db
      .select(select)
      .from(contentRelation)
      .innerJoin(other, eq(other.id, contentRelation.toId))
      .leftJoin(cat, eq(cat.id, other.categoryId))
      .where(and(eq(contentRelation.fromId, contentId), eq(other.status, 'PUBLISHED')))
      .orderBy(asc(contentRelation.sortOrder), asc(other.title)),
    db
      .select(select)
      .from(contentRelation)
      .innerJoin(other, eq(other.id, contentRelation.fromId))
      .leftJoin(cat, eq(cat.id, other.categoryId))
      .where(and(eq(contentRelation.toId, contentId), eq(other.status, 'PUBLISHED')))
      .orderBy(desc(other.favoriteCount), asc(other.title))
      .limit(40),
  ])
  const seen = new Set<string>()
  const result: RelatedItem[] = []
  for (const [rows, direction] of [
    [outgoing, 'out'],
    [incoming, 'in'],
  ] as const) {
    for (const r of rows) {
      const key = `${r.id}:${direction === 'out' ? r.kind : 'in'}`
      if (seen.has(key) || seen.has(`${r.id}:RELATED`)) continue
      seen.add(key)
      result.push({ ...r, direction })
    }
  }
  return result
}

export function groupRelated(items: RelatedItem[]) {
  return {
    requiredTools: items.filter((i) => i.direction === 'out' && i.kind === 'REQUIRED_TOOL'),
    optionalTools: items.filter((i) => i.direction === 'out' && i.kind === 'OPTIONAL_TOOL'),
    compatibleTools: items.filter((i) => i.direction === 'out' && i.kind === 'COMPATIBLE_TOOL'),
    prompts: dedupe(items.filter((i) => i.type === 'PROMPT')),
    workflows: dedupe(items.filter((i) => i.type === 'WORKFLOW')),
    references: dedupe(items.filter((i) => i.type === 'REFERENCE')),
    tutorials: dedupe(items.filter((i) => i.type === 'TUTORIAL')),
    tools: dedupe(items.filter((i) => i.type === 'TOOL')),
  }
}

function dedupe(items: RelatedItem[]) {
  const seen = new Set<string>()
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
}

export async function isFavorited(userId: string, contentId: string) {
  const [row] = await db
    .select({ one: sql`1` })
    .from(favorite)
    .where(and(eq(favorite.userId, userId), eq(favorite.contentId, contentId)))
    .limit(1)
  return Boolean(row)
}

/* -------------------------------------------------------------------------- */
/* Descoberta (Home / Explorar)                                               */
/* -------------------------------------------------------------------------- */

export async function getLatest(userId: string, limit = 8) {
  const rows = await baseCardQuery()
    .where(and(eq(contentItem.status, 'PUBLISHED'), isNotNull(contentItem.publishedAt)))
    .orderBy(desc(contentItem.publishedAt))
    .limit(limit)
  return hydrateCards(rows, userId)
}

export async function getPopular(userId: string, types: ContentType[], limit = 6) {
  const rows = await baseCardQuery()
    .where(and(eq(contentItem.status, 'PUBLISHED'), inArray(contentItem.type, types)))
    .orderBy(desc(sql`${contentItem.favoriteCount} * 3 + ${contentItem.useCount} * 2 + ${contentItem.viewCount}`))
    .limit(limit)
  return hydrateCards(rows, userId)
}

export async function getFeatured(userId: string, limit = 6) {
  const rows = await baseCardQuery()
    .where(and(eq(contentItem.status, 'PUBLISHED'), eq(contentItem.featured, true)))
    .orderBy(desc(contentItem.publishedAt))
    .limit(limit)
  return hydrateCards(rows, userId)
}

/**
 * Recomendações simples e explicáveis: conteúdo que compartilha tags ou categoria com o que o
 * usuário favoritou/viu recentemente. Sem sinais suficientes, cai para os destaques.
 * (Ponto de extensão para personalização/semântica futura.)
 */
export async function getRecommended(userId: string, limit = 6): Promise<ContentCard[]> {
  const rows = await db.execute<{ id: string }>(sql`
    with seeds as (
      (select content_id from favorite where user_id = ${userId} order by created_at desc limit 20)
      union
      (select content_id from history_event where user_id = ${userId} order by created_at desc limit 40)
    ),
    seed_tags as (select distinct tag_id from content_tag where content_id in (select content_id from seeds)),
    seed_categories as (select distinct category_id from content_item where id in (select content_id from seeds) and category_id is not null)
    select ci.id
    from content_item ci
    left join content_tag ct on ct.content_id = ci.id and ct.tag_id in (select tag_id from seed_tags)
    where ci.status = 'PUBLISHED' and ci.id not in (select content_id from seeds)
    group by ci.id
    having count(ct.tag_id) > 0 or bool_or(ci.category_id in (select category_id from seed_categories))
    order by count(ct.tag_id) desc, max(ci.favorite_count) desc, max(ci.published_at) desc
    limit ${limit}
  `)
  const ids = rows.map((r) => r.id)
  if (ids.length >= Math.min(3, limit)) return getCardsByIds(ids, userId)
  const featured = await getFeatured(userId, limit)
  const merged = [...(await getCardsByIds(ids, userId)), ...featured.filter((f) => !ids.includes(f.id))]
  return merged.slice(0, limit)
}

export async function getContentCountsByType() {
  const rows = await db
    .select({ type: contentItem.type, count: sql<number>`count(*)::int` })
    .from(contentItem)
    .where(eq(contentItem.status, 'PUBLISHED'))
    .groupBy(contentItem.type)
  return Object.fromEntries(rows.map((r) => [r.type, r.count])) as Partial<Record<ContentType, number>>
}

export async function getExploreCategories() {
  return db
    .select({
      slug: category.slug,
      name: category.name,
      description: category.description,
      icon: category.icon,
      count: sql<number>`count(${contentItem.id})::int`,
    })
    .from(category)
    .leftJoin(contentItem, and(eq(contentItem.categoryId, category.id), eq(contentItem.status, 'PUBLISHED')))
    .where(eq(category.kind, 'CONTENT'))
    .groupBy(category.id)
    .orderBy(asc(category.sortOrder), asc(category.name))
}

export async function getCategoryBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(category)
    .where(and(eq(category.kind, 'CONTENT'), eq(category.slug, slug)))
    .limit(1)
  return row ?? null
}

export async function getCategoryContent(categoryId: string, userId: string) {
  const rows = await baseCardQuery()
    .where(and(eq(contentItem.categoryId, categoryId), eq(contentItem.status, 'PUBLISHED')))
    .orderBy(asc(contentItem.type), desc(contentItem.featured), desc(contentItem.publishedAt))
    .limit(120)
  return hydrateCards(rows, userId)
}

/** Lista leve de conteúdo publicado para seletores (experimentos, coleções). */
export async function listPickable(types: ContentType[]) {
  return db
    .select({ id: contentItem.id, type: contentItem.type, title: contentItem.title, slug: contentItem.slug })
    .from(contentItem)
    .where(and(inArray(contentItem.type, types), eq(contentItem.status, 'PUBLISHED')))
    .orderBy(asc(contentItem.type), asc(contentItem.title))
    .limit(1000)
}


/** Tutorial de entrada para quem ainda não tem histórico (iniciante, destaque primeiro). */
export async function getStarterTutorial() {
  const [row] = await db
    .select({ slug: contentItem.slug, title: contentItem.title, summary: contentItem.summary })
    .from(contentItem)
    .where(and(eq(contentItem.type, 'TUTORIAL'), eq(contentItem.status, 'PUBLISHED')))
    .orderBy(sql`(${contentItem.difficulty} = 'BEGINNER') desc nulls last`, desc(contentItem.featured), asc(contentItem.publishedAt))
    .limit(1)
  return row ?? null
}
