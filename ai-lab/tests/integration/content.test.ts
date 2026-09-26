import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DB, migrateTestDb } from './setup'

const run = TEST_DB ? describe : describe.skip

run('integração com Postgres', () => {
  let db: typeof import('@/server/db').db
  let schema: typeof import('@/server/db/schema')
  let q: typeof import('@/server/queries/content')
  let search: import('@/server/services/search/types').SearchProvider
  const userId = randomUUID()

  beforeAll(async () => {
    migrateTestDb()
    ;({ db } = await import('@/server/db'))
    schema = await import('@/server/db/schema')
    q = await import('@/server/queries/content')
    const { PostgresSearchProvider } = await import('@/server/services/search/postgres')
    search = new PostgresSearchProvider()
    const { ingestContent } = await import('@/server/content-ingest')
    const { contentBundleSchema } = await import('@/lib/content-bundle')
    const { seedBundle } = await import('../../content')
    await db.execute(sql`truncate content_item, category, tag, "user" cascade`)
    const report = await ingestContent(db, contentBundleSchema.parse(seedBundle))
    expect(report.warnings).toEqual([])
    await db.insert(schema.user).values({ id: userId, name: 'Teste', email: `t-${userId}@intelra.test` })
  })

  afterAll(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, userId))
  })

  it('ingestão é idempotente (não duplica nem sobrescreve)', async () => {
    const { ingestContent } = await import('@/server/content-ingest')
    const { contentBundleSchema } = await import('@/lib/content-bundle')
    const { seedBundle } = await import('../../content')
    const before = await db.select({ n: sql<number>`count(*)::int` }).from(schema.contentItem)
    const report = await ingestContent(db, contentBundleSchema.parse(seedBundle))
    const after = await db.select({ n: sql<number>`count(*)::int` }).from(schema.contentItem)
    expect(report.created).toBe(0)
    expect(report.skipped).toBe(before[0].n)
    expect(after[0].n).toBe(before[0].n)
  })

  it('filtro de mídia retorna apenas prompts de vídeo', async () => {
    const res = await q.listContent({ type: 'PROMPT', media: 'VIDEO' }, userId)
    expect(res.total).toBeGreaterThan(0)
    expect(res.items.every((i) => i.mediaType === 'VIDEO')).toBe(true)
    const all = await q.listContent({ type: 'PROMPT' }, userId)
    expect(res.total).toBeLessThan(all.total)
  })

  it('filtro de ferramenta usa o grafo de relações', async () => {
    const res = await q.listContent({ type: 'PROMPT', tool: 'kling-ai' }, userId)
    expect(res.total).toBeGreaterThan(0)
    expect(res.items.every((i) => i.tools.some((t) => t.slug === 'kling-ai'))).toBe(true)
  })

  it('filtros de dificuldade, categoria, tag, tempo e preço filtram de verdade', async () => {
    const beginners = await q.listContent({ type: 'TUTORIAL', difficulty: 'BEGINNER' }, userId)
    expect(beginners.items.every((i) => i.difficulty === 'BEGINNER')).toBe(true)
    const moda = await q.listContent({ type: 'PROMPT', category: 'moda' }, userId)
    expect(moda.total).toBeGreaterThan(0)
    expect(moda.items.every((i) => i.category?.slug === 'moda')).toBe(true)
    const tagged = await q.listContent({ type: 'PROMPT', tag: 'produto' }, userId)
    expect(tagged.items.every((i) => i.tags.some((t) => t.slug === 'produto'))).toBe(true)
    const short = await q.listContent({ type: 'WORKFLOW', time: 'short' }, userId)
    expect(short.items.every((i) => (i.estimatedMinutes ?? 0) <= 30)).toBe(true)
    const paid = await q.listContent({ type: 'TOOL', pricing: 'PAID' }, userId)
    expect(paid.total).toBeGreaterThan(0)
    expect(paid.items.every((i) => i.pricingStatus === 'PAID')).toBe(true)
    const none = await q.listContent({ type: 'PROMPT', category: 'categoria-inexistente' }, userId)
    expect(none.total).toBe(0)
  })

  it('ordenação A–Z e paginação', async () => {
    const page1 = await q.listContent({ type: 'PROMPT', sort: 'az', pageSize: 5 }, userId)
    const titles = page1.items.map((i) => i.title.toLowerCase())
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'en')))
    const page2 = await q.listContent({ type: 'PROMPT', sort: 'az', pageSize: 5, page: 2 }, userId)
    expect(page2.items[0].id).not.toBe(page1.items[0].id)
    expect(page1.pageCount).toBe(Math.ceil(page1.total / 5))
  })

  it('busca global: relevância, sem acento, com erro de digitação e entrada maliciosa', async () => {
    const res = await search.search('fotografia de produto')
    expect(res[0].slug).toBe('luxury-product-photography-studio-campaign')
    expect(res[0].reasons.length).toBeGreaterThan(0)
    expect((await search.search('cinematico')).some((r) => r.slug === 'cinematic-fitness-campaign')).toBe(true)
    expect((await search.search('midjorney')).some((r) => r.slug === 'midjourney')).toBe(true)
    await expect(search.search("'); drop table content_item; --")).resolves.toBeInstanceOf(Array)
    expect(await search.search('   ')).toEqual([])
    const onlyTools = await search.search('vídeo', { types: ['TOOL'] })
    expect(onlyTools.length).toBeGreaterThan(0)
    expect(onlyTools.every((r) => r.type === 'TOOL')).toBe(true)
  })

  it('rascunhos não aparecem para membros', async () => {
    const [item] = await db
      .update(schema.contentItem)
      .set({ status: 'DRAFT' })
      .where(eq(schema.contentItem.slug, 'editorial-fashion-portrait'))
      .returning({ id: schema.contentItem.id })
    try {
      const list = await q.listContent({ type: 'PROMPT', q: 'editorial fashion' }, userId)
      expect(list.items.some((i) => i.id === item.id)).toBe(false)
      expect((await search.search('editorial fashion portrait')).some((r) => r.id === item.id)).toBe(false)
      expect(await q.getContentMeta('PROMPT', 'editorial-fashion-portrait')).toBeNull()
      expect(await q.getContentMeta('PROMPT', 'editorial-fashion-portrait', { includeUnpublished: true })).not.toBeNull()
    } finally {
      await db.update(schema.contentItem).set({ status: 'PUBLISHED' }).where(eq(schema.contentItem.id, item.id))
    }
  })

  it('grafo: ferramenta mostra prompts e workflows que a usam', async () => {
    const kling = await q.getContentMeta('TOOL', 'kling-ai')
    const related = q.groupRelated(await q.getRelated(kling!.id))
    expect(related.prompts.length).toBeGreaterThan(0)
    expect(related.workflows.length).toBeGreaterThan(0)
  })

  it('favorito duplicado é bloqueado pelo banco', async () => {
    const [c] = await db.select({ id: schema.contentItem.id }).from(schema.contentItem).limit(1)
    await db.insert(schema.favorite).values({ userId, contentId: c.id })
    await expect(db.insert(schema.favorite).values({ userId, contentId: c.id })).rejects.toThrow()
    const inserted = await db.insert(schema.favorite).values({ userId, contentId: c.id }).onConflictDoNothing().returning()
    expect(inserted).toHaveLength(0)
  })

  it('item de coleção exige exatamente um alvo e relação não aponta para si mesma', async () => {
    const [col] = await db.insert(schema.collection).values({ userId, name: 'Teste' }).returning()
    await expect(db.insert(schema.collectionItem).values({ collectionId: col.id })).rejects.toThrow()
    const [c] = await db.select({ id: schema.contentItem.id }).from(schema.contentItem).limit(1)
    await expect(db.insert(schema.contentRelation).values({ fromId: c.id, toId: c.id, kind: 'RELATED' })).rejects.toThrow()
  })

  it('recomendações usam sinais do usuário e caem para destaques', async () => {
    const recs = await q.getRecommended(userId, 4)
    expect(recs.length).toBeGreaterThan(0)
    expect(new Set(recs.map((r) => r.id)).size).toBe(recs.length)
  })
})
