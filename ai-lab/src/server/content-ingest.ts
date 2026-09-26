import { and, desc, eq, inArray } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { ContentBundle } from '@/lib/content-bundle'
import type { ContentType } from '@/lib/labels'
import { slugify } from '@/lib/utils'
import * as schema from './db/schema'
import { refreshSearchKeywords } from './db/maintenance'

const {
  category,
  contentItem,
  contentRelation,
  contentTag,
  prompt,
  promptVariable,
  promptVersion,
  reference,
  tag,
  tool,
  tutorial,
  tutorialStep,
  workflow,
  workflowStep,
} = schema

type Db = PostgresJsDatabase<typeof schema>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export type IngestOptions = {
  /** true: atualiza itens existentes (mesmo tipo+slug). false (padrão): mantém edições feitas no admin. */
  update?: boolean
  log?: (message: string) => void
}

export type IngestReport = { created: number; updated: number; skipped: number; warnings: string[] }

/**
 * Motor de ingestão idempotente. Chave natural: (tipo, slug).
 * Duas passadas: 1) cria/atualiza itens; 2) resolve relações e etapas por slug.
 */
export async function ingestContent(db: Db, bundle: ContentBundle, options: IngestOptions = {}): Promise<IngestReport> {
  const log = options.log ?? (() => {})
  const report: IngestReport = { created: 0, updated: 0, skipped: 0, warnings: [] }

  await db.transaction(async (tx) => {
    // Categorias
    for (const [index, c] of bundle.categories.entries()) {
      await tx
        .insert(category)
        .values({ kind: c.kind, slug: c.slug, name: c.name, description: c.description, icon: c.icon, sortOrder: index })
        .onConflictDoUpdate({
          target: [category.kind, category.slug],
          set: { name: c.name, description: c.description, icon: c.icon, sortOrder: index },
        })
    }
    const categories = await tx.select({ id: category.id, kind: category.kind, slug: category.slug }).from(category)
    const categoryId = (kind: 'CONTENT' | 'TOOL', slug?: string) => {
      if (!slug) return null
      const found = categories.find((c) => c.kind === kind && c.slug === slug)
      if (!found) report.warnings.push(`Categoria "${slug}" (${kind}) não existe`)
      return found?.id ?? null
    }

    const touched = new Map<string, string>() // "TYPE:slug" -> id (itens criados/atualizados nesta execução)
    const allItems = new Map<string, string>()

    const upsertBase = async (type: ContentType, item: ContentBundle['prompts'][number] | ContentBundle['tools'][number] | ContentBundle['workflows'][number] | ContentBundle['references'][number] | ContentBundle['tutorials'][number]) => {
      const [existing] = await tx
        .select({ id: contentItem.id, publishedAt: contentItem.publishedAt })
        .from(contentItem)
        .where(and(eq(contentItem.type, type), eq(contentItem.slug, item.slug)))
        .limit(1)
      if (existing && !options.update) {
        report.skipped++
        return null
      }
      const values = {
        type,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        description: item.description,
        categoryId: categoryId(type === 'TOOL' ? 'TOOL' : 'CONTENT', item.category),
        difficulty: item.difficulty ?? null,
        status: item.status,
        featured: item.featured,
        coverImageUrl: item.coverImageUrl ?? null,
        publishedAt: item.status === 'PUBLISHED' ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
      }
      let id: string
      if (existing) {
        await tx.update(contentItem).set(values).where(eq(contentItem.id, existing.id))
        id = existing.id
        report.updated++
      } else {
        const [created] = await tx.insert(contentItem).values(values).returning({ id: contentItem.id })
        id = created.id
        report.created++
      }
      await setTags(tx, id, item.tags)
      touched.set(`${type}:${item.slug}`, id)
      log(`${existing ? '↻' : '+'} ${type} ${item.slug}`)
      return id
    }

    for (const t of bundle.tools) {
      const id = await upsertBase('TOOL', t)
      if (!id) continue
      const values = {
        websiteUrl: t.websiteUrl ?? null,
        logoUrl: t.logoUrl ?? null,
        pricingStatus: t.pricingStatus,
        pricingNote: t.pricingNote ?? null,
        primaryUse: t.primaryUse ?? null,
        capabilities: t.capabilities,
        supportedMedia: t.supportedMedia,
        strengths: t.strengths,
        limitations: t.limitations,
        verificationStatus: t.verificationStatus,
        verifiedAt: t.verifiedAt ? new Date(t.verifiedAt) : null,
      }
      await tx.insert(tool).values({ contentId: id, ...values }).onConflictDoUpdate({ target: tool.contentId, set: values })
    }

    for (const p of bundle.prompts) {
      const id = await upsertBase('PROMPT', p)
      if (!id) continue
      const values = {
        body: p.body,
        negativePrompt: p.negativePrompt ?? null,
        mediaType: p.mediaType,
        aspectRatio: p.aspectRatio ?? null,
        parameters: p.parameters,
        recommendedSettings: p.recommendedSettings,
        expectedResult: p.expectedResult ?? null,
        tips: p.tips,
      }
      await tx.insert(prompt).values({ contentId: id, ...values }).onConflictDoUpdate({ target: prompt.contentId, set: values })
      await recordPromptVersion(tx, id, p.body, p.negativePrompt ?? null, p.parameters, 'Importação de conteúdo')
      await tx.delete(promptVariable).where(eq(promptVariable.promptId, id))
      if (p.variables.length)
        await tx.insert(promptVariable).values(p.variables.map((v, i) => ({ ...v, promptId: id, sortOrder: i })))
    }

    for (const r of bundle.references) {
      const id = await upsertBase('REFERENCE', r)
      if (!id) continue
      const values = {
        sourceName: r.sourceName ?? null,
        sourceUrl: r.sourceUrl ?? null,
        style: r.style ?? null,
        notes: r.notes ?? null,
        palette: r.palette,
        aspectRatio: r.aspectRatio ?? null,
      }
      await tx.insert(reference).values({ contentId: id, ...values }).onConflictDoUpdate({ target: reference.contentId, set: values })
    }

    for (const w of bundle.workflows) {
      const id = await upsertBase('WORKFLOW', w)
      if (!id) continue
      const values = {
        objective: w.objective,
        estimatedMinutes: w.estimatedMinutes ?? null,
        inputs: w.inputs,
        expectedOutput: w.expectedOutput ?? null,
        alternatives: w.alternatives,
        troubleshooting: w.troubleshooting,
      }
      await tx.insert(workflow).values({ contentId: id, ...values }).onConflictDoUpdate({ target: workflow.contentId, set: values })
    }

    for (const t of bundle.tutorials) {
      const id = await upsertBase('TUTORIAL', t)
      if (!id) continue
      const values = {
        objective: t.objective,
        estimatedMinutes: t.estimatedMinutes ?? null,
        prerequisites: t.prerequisites,
        mistakes: t.mistakes,
        proTips: t.proTips,
      }
      await tx.insert(tutorial).values({ contentId: id, ...values }).onConflictDoUpdate({ target: tutorial.contentId, set: values })
    }

    // Segunda passada: resolver slugs → ids (inclui itens já existentes no banco).
    const everything = await tx.select({ id: contentItem.id, type: contentItem.type, slug: contentItem.slug }).from(contentItem)
    for (const row of everything) allItems.set(`${row.type}:${row.slug}`, row.id)
    const resolve = (key: string, context: string) => {
      const id = allItems.get(key)
      if (!id) report.warnings.push(`${context}: referência "${key}" não encontrada`)
      return id ?? null
    }

    const setRelations = async (fromKey: string, rels: { key: string; kind: schema.RelationKind }[]) => {
      const fromId = touched.get(fromKey)
      if (!fromId) return
      await tx.delete(contentRelation).where(eq(contentRelation.fromId, fromId))
      const rows = rels
        .map((r, i) => ({ fromId, toId: resolve(r.key, fromKey), kind: r.kind, sortOrder: i }))
        .filter((r): r is { fromId: string; toId: string; kind: schema.RelationKind; sortOrder: number } => Boolean(r.toId) && r.toId !== fromId)
      if (rows.length) await tx.insert(contentRelation).values(rows).onConflictDoNothing()
    }

    for (const p of bundle.prompts)
      await setRelations(`PROMPT:${p.slug}`, [
        ...p.tools.map((s) => ({ key: `TOOL:${s}`, kind: 'COMPATIBLE_TOOL' as const })),
        ...p.related.map((key) => ({ key, kind: 'RELATED' as const })),
      ])
    for (const r of bundle.references)
      await setRelations(`REFERENCE:${r.slug}`, [
        ...r.tools.map((s) => ({ key: `TOOL:${s}`, kind: 'COMPATIBLE_TOOL' as const })),
        ...r.related.map((key) => ({ key, kind: 'RELATED' as const })),
      ])
    for (const t of bundle.tutorials)
      await setRelations(`TUTORIAL:${t.slug}`, [
        ...t.tools.map((s) => ({ key: `TOOL:${s}`, kind: 'COMPATIBLE_TOOL' as const })),
        ...t.related.map((key) => ({ key, kind: 'RELATED' as const })),
      ])
    for (const t of bundle.tools)
      await setRelations(
        `TOOL:${t.slug}`,
        t.related.map((key) => ({ key, kind: 'RELATED' as const })),
      )
    for (const w of bundle.workflows) {
      const key = `WORKFLOW:${w.slug}`
      await setRelations(key, [
        ...w.requiredTools.map((s) => ({ key: `TOOL:${s}`, kind: 'REQUIRED_TOOL' as const })),
        ...w.optionalTools.map((s) => ({ key: `TOOL:${s}`, kind: 'OPTIONAL_TOOL' as const })),
        ...w.related.map((k) => ({ key: k, kind: 'RELATED' as const })),
        // prompts usados nas etapas também entram no grafo
        ...w.steps.filter((s) => s.prompt).map((s) => ({ key: `PROMPT:${s.prompt}`, kind: 'RELATED' as const })),
      ])
      const workflowId = touched.get(key)
      if (!workflowId) continue
      await tx.delete(workflowStep).where(eq(workflowStep.workflowId, workflowId))
      await tx.insert(workflowStep).values(
        w.steps.map((s, position) => ({
          workflowId,
          position,
          title: s.title,
          description: s.description,
          settings: s.settings ?? null,
          tip: s.tip ?? null,
          toolId: s.tool ? resolve(`TOOL:${s.tool}`, key) : null,
          promptId: s.prompt ? resolve(`PROMPT:${s.prompt}`, key) : null,
        })),
      )
    }
    for (const t of bundle.tutorials) {
      const key = `TUTORIAL:${t.slug}`
      const tutorialId = touched.get(key)
      if (!tutorialId) continue
      await tx.delete(tutorialStep).where(eq(tutorialStep.tutorialId, tutorialId))
      await tx.insert(tutorialStep).values(
        t.steps.map((s, position) => ({
          tutorialId,
          position,
          title: s.title,
          body: s.body,
          promptId: s.prompt ? resolve(`PROMPT:${s.prompt}`, key) : null,
        })),
      )
    }

    if (touched.size) await refreshSearchKeywords(tx, [...touched.values()])
  })

  return report
}

async function setTags(tx: Tx, contentId: string, names: string[]) {
  await tx.delete(contentTag).where(eq(contentTag.contentId, contentId))
  const unique = [...new Map(names.map((n) => [slugify(n), n.trim()])).entries()].filter(([s]) => s)
  if (!unique.length) return
  await tx
    .insert(tag)
    .values(unique.map(([slug, name]) => ({ slug, name })))
    .onConflictDoNothing()
  const rows = await tx
    .select({ id: tag.id })
    .from(tag)
    .where(
      inArray(
        tag.slug,
        unique.map(([s]) => s),
      ),
    )
  await tx.insert(contentTag).values(rows.map((r) => ({ contentId, tagId: r.id })))
}

/** Cria uma nova versão quando o texto do prompt muda (histórico auditável). */
export async function recordPromptVersion(
  tx: Tx,
  promptId: string,
  body: string,
  negativePrompt: string | null,
  parameters: schema.KeyValue[],
  changelog: string,
  createdById?: string,
) {
  const [latest] = await tx
    .select({ version: promptVersion.version, body: promptVersion.body, negativePrompt: promptVersion.negativePrompt })
    .from(promptVersion)
    .where(eq(promptVersion.promptId, promptId))
    .orderBy(desc(promptVersion.version))
    .limit(1)
  if (latest && latest.body === body && (latest.negativePrompt ?? null) === negativePrompt) return latest.version
  const version = (latest?.version ?? 0) + 1
  await tx.insert(promptVersion).values({ promptId, version, body, negativePrompt, parameters, changelog, createdById })
  await tx.update(prompt).set({ currentVersion: version }).where(eq(prompt.contentId, promptId))
  return version
}


