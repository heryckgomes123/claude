'use server'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  CONTENT_STATUSES,
  DIFFICULTIES,
  MEDIA_TYPES,
  PRICING_STATUSES,
  VERIFICATION_STATUSES,
  type ContentType,
} from '@/lib/labels'
import { slugify } from '@/lib/utils'
import { optionalText, optionalUrl, requiredText, slugSchema, uuid } from '@/lib/validation'
import { accessCodeHint, generateAccessCode, hashAccessCode } from '../access/codes'
import { isRole } from '../access/roles'
import { assertPermission } from '../auth/viewer'
import { recordPromptVersion } from '../content-ingest'
import { db } from '../db'
import { refreshSearchKeywords } from '../db/maintenance'
import {
  accessCode,
  category,
  contentItem,
  contentRelation,
  contentTag,
  labUpdate,
  membership,
  plan,
  prompt,
  promptVariable,
  reference,
  tag,
  tool,
  tutorial,
  tutorialStep,
  user,
  workflow,
  workflowStep,
  type RelationKind,
} from '../db/schema'
import { fail, handleActionError, ok, type ActionResult } from './result'

/* -------------------------------------------------------------------------- */
/* Schemas do editor de conteúdo                                              */
/* -------------------------------------------------------------------------- */

const lines = (maxItems: number, maxLen = 400) =>
  z
    .array(z.string().trim().max(maxLen))
    .max(maxItems)
    .transform((list) => list.filter(Boolean))
const keyValues = z
  .array(z.object({ label: z.string().trim().max(80), value: z.string().trim().max(400) }))
  .max(30)
  .transform((list) => list.filter((kv) => kv.label && kv.value))
const optionalUuid = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(uuid.nullable())
const uuidList = z.array(uuid).max(200).default([])
const minutes = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 10_000), 'Informe minutos (número inteiro)')

const baseContent = z.object({
  id: uuid.optional(),
  title: requiredText(160, 'Título'),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? ''),
  summary: z.string().trim().max(400).default(''),
  description: z.string().trim().max(8000).default(''),
  coverImageUrl: optionalUrl,
  categoryId: optionalUuid,
  difficulty: z
    .enum(DIFFICULTIES)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => v || null),
  status: z.enum(CONTENT_STATUSES),
  featured: z.boolean().default(false),
  tags: lines(20, 40),
  relatedIds: uuidList,
  toolIds: uuidList,
  changelog: optionalText(280),
})

const promptFields = z.object({
  type: z.literal('PROMPT'),
  body: requiredText(8000, 'Prompt'),
  negativePrompt: optionalText(2000),
  mediaType: z.enum(MEDIA_TYPES),
  aspectRatio: optionalText(20),
  parameters: keyValues,
  recommendedSettings: keyValues,
  expectedResult: optionalText(2000),
  tips: lines(20),
  variables: z
    .array(
      z.object({
        key: z
          .string()
          .trim()
          .regex(/^[a-zA-Z0-9_-]{1,60}$/, 'Chave: letras, números, _ ou -'),
        label: requiredText(80, 'Rótulo'),
        placeholder: optionalText(300),
        defaultValue: optionalText(500),
        description: optionalText(300),
      }),
    )
    .max(30)
    .refine((list) => new Set(list.map((v) => v.key)).size === list.length, 'Chaves de variáveis repetidas'),
})

const workflowFields = z.object({
  type: z.literal('WORKFLOW'),
  objective: z.string().trim().max(2000).default(''),
  estimatedMinutes: minutes,
  inputs: lines(30),
  expectedOutput: optionalText(2000),
  alternatives: lines(20),
  troubleshooting: z
    .array(z.object({ problem: z.string().trim().max(300), solution: z.string().trim().max(1000) }))
    .max(20)
    .transform((list) => list.filter((t) => t.problem && t.solution)),
  requiredToolIds: uuidList,
  optionalToolIds: uuidList,
  steps: z
    .array(
      z.object({
        title: requiredText(160, 'Título da etapa'),
        description: z.string().trim().max(3000).default(''),
        toolId: optionalUuid,
        promptId: optionalUuid,
        settings: optionalText(500),
        tip: optionalText(500),
      }),
    )
    .min(1, 'Adicione pelo menos uma etapa')
    .max(40),
})

const toolFields = z.object({
  type: z.literal('TOOL'),
  websiteUrl: optionalUrl,
  logoUrl: optionalUrl,
  pricingStatus: z.enum(PRICING_STATUSES),
  pricingNote: optionalText(500),
  primaryUse: optionalText(200),
  capabilities: lines(30, 120),
  supportedMedia: z.array(z.enum(MEDIA_TYPES)).max(5),
  strengths: lines(20),
  limitations: lines(20),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  verifiedAt: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), 'Data inválida'),
})

const referenceFields = z.object({
  type: z.literal('REFERENCE'),
  sourceName: optionalText(160),
  sourceUrl: optionalUrl,
  style: optionalText(160),
  notes: optionalText(4000),
  palette: z
    .array(z.string().trim())
    .max(10)
    .transform((list) => list.filter(Boolean))
    .pipe(z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use cores hex (#RRGGBB)'))),
  aspectRatio: optionalText(20),
})

const tutorialFields = z.object({
  type: z.literal('TUTORIAL'),
  objective: z.string().trim().max(2000).default(''),
  estimatedMinutes: minutes,
  prerequisites: lines(20),
  mistakes: lines(20),
  proTips: lines(20),
  steps: z
    .array(z.object({ title: requiredText(160, 'Título do passo'), body: z.string().trim().max(5000).default(''), promptId: optionalUuid }))
    .min(1, 'Adicione pelo menos um passo')
    .max(40),
})

const contentInputSchema = z.discriminatedUnion('type', [
  baseContent.extend(promptFields.shape),
  baseContent.extend(workflowFields.shape),
  baseContent.extend(toolFields.shape),
  baseContent.extend(referenceFields.shape),
  baseContent.extend(tutorialFields.shape),
])

export type ContentInput = z.input<typeof contentInputSchema>

/* -------------------------------------------------------------------------- */
/* Salvar conteúdo                                                            */
/* -------------------------------------------------------------------------- */

export async function saveContent(input: ContentInput): Promise<ActionResult<{ id: string }>> {
  let savedId: string
  let created = false
  try {
    const viewer = await assertPermission('content:write')
    const parsed = contentInputSchema.safeParse(input)
    if (!parsed.success) return handleActionError(parsed.error)
    const data = parsed.data
    if (data.status === 'PUBLISHED') await assertPermission('content:publish')

    const slug = data.slug ? data.slug : slugify(data.title)
    const slugCheck = slugSchema.safeParse(slug)
    if (!slugCheck.success) return fail('Slug inválido.', { slug: slugCheck.error.issues[0].message })

    // Unicidade do slug por tipo
    const [clash] = await db
      .select({ id: contentItem.id })
      .from(contentItem)
      .where(and(eq(contentItem.type, data.type), eq(contentItem.slug, slug), data.id ? ne(contentItem.id, data.id) : undefined))
      .limit(1)
    if (clash) return fail('Já existe um conteúdo deste tipo com esse slug.', { slug: 'Slug em uso' })

    // Validação das referências (tipos corretos, sem auto-relação)
    const referenced = [
      ...data.relatedIds,
      ...data.toolIds,
      ...(data.type === 'WORKFLOW'
        ? [...data.requiredToolIds, ...data.optionalToolIds, ...data.steps.flatMap((s) => [s.toolId, s.promptId])]
        : []),
      ...(data.type === 'TUTORIAL' ? data.steps.map((s) => s.promptId) : []),
      data.categoryId,
    ].filter((v): v is string => Boolean(v))
    const refRows = referenced.length
      ? await db.select({ id: contentItem.id, type: contentItem.type }).from(contentItem).where(inArray(contentItem.id, referenced))
      : []
    const typeOf = new Map(refRows.map((r) => [r.id, r.type]))
    const expectType = (ids: (string | null)[], type: ContentType) => ids.every((id) => !id || typeOf.get(id) === type)
    if (data.id && data.relatedIds.includes(data.id)) return fail('Um conteúdo não pode se relacionar consigo mesmo.')
    if (data.relatedIds.some((id) => !typeOf.has(id))) return fail('Há conteúdos relacionados inválidos.')
    if (!expectType(data.toolIds, 'TOOL')) return fail('Selecione apenas ferramentas em “Ferramentas compatíveis”.')
    if (data.type === 'WORKFLOW') {
      if (!expectType([...data.requiredToolIds, ...data.optionalToolIds], 'TOOL')) return fail('Ferramentas inválidas.')
      if (!expectType(data.steps.map((s) => s.toolId), 'TOOL') || !expectType(data.steps.map((s) => s.promptId), 'PROMPT'))
        return fail('Há etapas com ferramenta ou prompt inválidos.')
    }
    if (data.type === 'TUTORIAL' && !expectType(data.steps.map((s) => s.promptId), 'PROMPT')) return fail('Passos com prompt inválido.')
    if (data.categoryId) {
      const [cat] = await db.select({ kind: category.kind }).from(category).where(eq(category.id, data.categoryId)).limit(1)
      if (!cat || cat.kind !== (data.type === 'TOOL' ? 'TOOL' : 'CONTENT')) return fail('Categoria inválida para este tipo.', { categoryId: 'Categoria inválida' })
    }

    savedId = await db.transaction(async (tx) => {
      const existing = data.id
        ? (
            await tx
              .select({ id: contentItem.id, type: contentItem.type, publishedAt: contentItem.publishedAt })
              .from(contentItem)
              .where(eq(contentItem.id, data.id))
              .limit(1)
          )[0]
        : undefined
      if (data.id && !existing) throw new Error('NOT_FOUND')
      if (existing && existing.type !== data.type) throw new Error('TYPE_MISMATCH')

      const values = {
        type: data.type,
        slug,
        title: data.title,
        summary: data.summary,
        description: data.description,
        coverImageUrl: data.coverImageUrl,
        categoryId: data.categoryId,
        difficulty: data.difficulty,
        status: data.status,
        featured: data.featured,
        publishedAt: data.status === 'PUBLISHED' ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
        updatedById: viewer.id,
      }
      let id: string
      if (existing) {
        await tx.update(contentItem).set(values).where(eq(contentItem.id, existing.id))
        id = existing.id
      } else {
        const [row] = await tx
          .insert(contentItem)
          .values({ ...values, createdById: viewer.id })
          .returning({ id: contentItem.id })
        id = row.id
        created = true
      }

      // Campos específicos por tipo
      if (data.type === 'PROMPT') {
        const v = {
          body: data.body,
          negativePrompt: data.negativePrompt,
          mediaType: data.mediaType,
          aspectRatio: data.aspectRatio,
          parameters: data.parameters,
          recommendedSettings: data.recommendedSettings,
          expectedResult: data.expectedResult,
          tips: data.tips,
        }
        await tx.insert(prompt).values({ contentId: id, ...v }).onConflictDoUpdate({ target: prompt.contentId, set: v })
        await recordPromptVersion(tx, id, data.body, data.negativePrompt, data.parameters, data.changelog ?? 'Edição no admin', viewer.id)
        await tx.delete(promptVariable).where(eq(promptVariable.promptId, id))
        if (data.variables.length)
          await tx.insert(promptVariable).values(data.variables.map((variable, i) => ({ ...variable, promptId: id, sortOrder: i })))
      } else if (data.type === 'WORKFLOW') {
        const v = {
          objective: data.objective,
          estimatedMinutes: data.estimatedMinutes,
          inputs: data.inputs,
          expectedOutput: data.expectedOutput,
          alternatives: data.alternatives,
          troubleshooting: data.troubleshooting,
        }
        await tx.insert(workflow).values({ contentId: id, ...v }).onConflictDoUpdate({ target: workflow.contentId, set: v })
        await tx.delete(workflowStep).where(eq(workflowStep.workflowId, id))
        await tx.insert(workflowStep).values(data.steps.map((s, position) => ({ ...s, position, workflowId: id })))
      } else if (data.type === 'TOOL') {
        const v = {
          websiteUrl: data.websiteUrl,
          logoUrl: data.logoUrl,
          pricingStatus: data.pricingStatus,
          pricingNote: data.pricingNote,
          primaryUse: data.primaryUse,
          capabilities: data.capabilities,
          supportedMedia: data.supportedMedia,
          strengths: data.strengths,
          limitations: data.limitations,
          verificationStatus: data.verificationStatus,
          verifiedAt: data.verifiedAt,
        }
        await tx.insert(tool).values({ contentId: id, ...v }).onConflictDoUpdate({ target: tool.contentId, set: v })
      } else if (data.type === 'REFERENCE') {
        const v = {
          sourceName: data.sourceName,
          sourceUrl: data.sourceUrl,
          style: data.style,
          notes: data.notes,
          palette: data.palette,
          aspectRatio: data.aspectRatio,
        }
        await tx.insert(reference).values({ contentId: id, ...v }).onConflictDoUpdate({ target: reference.contentId, set: v })
      } else {
        const v = {
          objective: data.objective,
          estimatedMinutes: data.estimatedMinutes,
          prerequisites: data.prerequisites,
          mistakes: data.mistakes,
          proTips: data.proTips,
        }
        await tx.insert(tutorial).values({ contentId: id, ...v }).onConflictDoUpdate({ target: tutorial.contentId, set: v })
        await tx.delete(tutorialStep).where(eq(tutorialStep.tutorialId, id))
        await tx.insert(tutorialStep).values(data.steps.map((s, position) => ({ ...s, position, tutorialId: id })))
      }

      // Tags (criadas sob demanda)
      await tx.delete(contentTag).where(eq(contentTag.contentId, id))
      const tagEntries = [...new Map(data.tags.map((name) => [slugify(name), name])).entries()].filter(([s]) => s)
      if (tagEntries.length) {
        await tx
          .insert(tag)
          .values(tagEntries.map(([s, name]) => ({ slug: s, name })))
          .onConflictDoNothing()
        const tagRows = await tx.select({ id: tag.id }).from(tag).where(inArray(tag.slug, tagEntries.map(([s]) => s)))
        await tx.insert(contentTag).values(tagRows.map((t) => ({ contentId: id, tagId: t.id })))
      }

      // Relações de saída (grafo de conhecimento)
      await tx.delete(contentRelation).where(eq(contentRelation.fromId, id))
      const rels: { toId: string; kind: RelationKind }[] = [
        ...data.relatedIds.map((toId) => ({ toId, kind: 'RELATED' as const })),
        ...data.toolIds.map((toId) => ({ toId, kind: 'COMPATIBLE_TOOL' as const })),
      ]
      if (data.type === 'WORKFLOW') {
        rels.push(...data.requiredToolIds.map((toId) => ({ toId, kind: 'REQUIRED_TOOL' as const })))
        rels.push(...data.optionalToolIds.map((toId) => ({ toId, kind: 'OPTIONAL_TOOL' as const })))
        rels.push(...data.steps.filter((s) => s.promptId).map((s) => ({ toId: s.promptId!, kind: 'RELATED' as const })))
      }
      const unique = [...new Map(rels.filter((r) => r.toId !== id).map((r) => [`${r.toId}:${r.kind}`, r])).values()]
      if (unique.length)
        await tx.insert(contentRelation).values(unique.map((r, sortOrder) => ({ fromId: id, toId: r.toId, kind: r.kind, sortOrder })))

      await refreshSearchKeywords(tx, [id])
      return id
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return fail('Conteúdo não encontrado.')
    if (error instanceof Error && error.message === 'TYPE_MISMATCH') return fail('O tipo de um conteúdo não pode ser alterado.')
    return handleActionError(error)
  }
  if (created) redirect(`/admin/content/${savedId}?created=1`)
  refresh()
  return ok({ id: savedId }, 'Conteúdo salvo')
}

/* -------------------------------------------------------------------------- */
/* Ações rápidas                                                              */
/* -------------------------------------------------------------------------- */

export async function setContentStatus(id: string, status: (typeof CONTENT_STATUSES)[number]): Promise<ActionResult> {
  try {
    await assertPermission(status === 'PUBLISHED' ? 'content:publish' : 'content:write')
    const contentId = uuid.parse(id)
    const next = z.enum(CONTENT_STATUSES).parse(status)
    const updated = await db
      .update(contentItem)
      .set({ status: next, publishedAt: next === 'PUBLISHED' ? sql`coalesce(${contentItem.publishedAt}, now())` : contentItem.publishedAt })
      .where(eq(contentItem.id, contentId))
      .returning({ id: contentItem.id })
    if (!updated.length) return fail('Conteúdo não encontrado.')
    refresh()
    return ok(undefined, 'Status atualizado')
  } catch (error) {
    return handleActionError(error)
  }
}

export async function toggleFeatured(id: string): Promise<ActionResult<{ featured: boolean }>> {
  try {
    await assertPermission('content:write')
    const [row] = await db
      .update(contentItem)
      .set({ featured: sql`not ${contentItem.featured}` })
      .where(eq(contentItem.id, uuid.parse(id)))
      .returning({ featured: contentItem.featured })
    if (!row) return fail('Conteúdo não encontrado.')
    refresh()
    return ok({ featured: row.featured })
  } catch (error) {
    return handleActionError(error)
  }
}

/** Exclusão definitiva — só para rascunhos ou arquivados (conteúdo publicado deve ser arquivado antes). */
export async function deleteContent(id: string): Promise<ActionResult> {
  try {
    await assertPermission('content:delete')
    const contentId = uuid.parse(id)
    const removed = await db
      .delete(contentItem)
      .where(and(eq(contentItem.id, contentId), inArray(contentItem.status, ['DRAFT', 'ARCHIVED'])))
      .returning({ id: contentItem.id })
    if (!removed.length) return fail('Arquive o conteúdo antes de excluí-lo.')
  } catch (error) {
    return handleActionError(error)
  }
  redirect('/admin/content')
}

/* -------------------------------------------------------------------------- */
/* Taxonomia                                                                  */
/* -------------------------------------------------------------------------- */

const categoryInput = z.object({
  id: uuid.optional(),
  kind: z.enum(['CONTENT', 'TOOL']),
  name: requiredText(80, 'Nome'),
  slug: z.string().trim().optional(),
  description: optionalText(300),
  icon: optionalText(30),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
})

export async function saveCategory(input: z.input<typeof categoryInput>): Promise<ActionResult> {
  try {
    await assertPermission('taxonomy:write')
    const data = categoryInput.parse(input)
    const slug = slugSchema.parse(data.slug || slugify(data.name))
    const values = { kind: data.kind, name: data.name, slug, description: data.description, icon: data.icon, sortOrder: data.sortOrder }
    if (data.id) {
      const updated = await db.update(category).set(values).where(eq(category.id, data.id)).returning({ id: category.id })
      if (!updated.length) return fail('Categoria não encontrada.')
      await refreshSearchKeywords(
        db,
        (await db.select({ id: contentItem.id }).from(contentItem).where(eq(contentItem.categoryId, data.id))).map((r) => r.id),
      )
    } else await db.insert(category).values(values)
    refresh()
    return ok(undefined, 'Categoria salva')
  } catch (error) {
    return handleActionError(error)
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await assertPermission('taxonomy:write')
    const removed = await db.delete(category).where(eq(category.id, uuid.parse(id))).returning({ id: category.id })
    if (!removed.length) return fail('Categoria não encontrada.')
    refresh()
    return ok(undefined, 'Categoria removida (conteúdos ficaram sem categoria)')
  } catch (error) {
    return handleActionError(error)
  }
}

export async function renameTag(id: string, name: string): Promise<ActionResult> {
  try {
    await assertPermission('taxonomy:write')
    const tagId = uuid.parse(id)
    const clean = requiredText(40, 'Nome').parse(name)
    const slug = slugSchema.parse(slugify(clean))
    const updated = await db.update(tag).set({ name: clean, slug }).where(eq(tag.id, tagId)).returning({ id: tag.id })
    if (!updated.length) return fail('Tag não encontrada.')
    const affected = await db.select({ id: contentTag.contentId }).from(contentTag).where(eq(contentTag.tagId, tagId))
    await refreshSearchKeywords(db, affected.map((a) => a.id))
    refresh()
    return ok(undefined, 'Tag renomeada')
  } catch (error) {
    return handleActionError(error)
  }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  try {
    await assertPermission('taxonomy:write')
    const tagId = uuid.parse(id)
    const affected = await db.select({ id: contentTag.contentId }).from(contentTag).where(eq(contentTag.tagId, tagId))
    const removed = await db.delete(tag).where(eq(tag.id, tagId)).returning({ id: tag.id })
    if (!removed.length) return fail('Tag não encontrada.')
    await refreshSearchKeywords(db, affected.map((a) => a.id))
    refresh()
    return ok(undefined, 'Tag removida')
  } catch (error) {
    return handleActionError(error)
  }
}

/* -------------------------------------------------------------------------- */
/* Membros e acesso                                                           */
/* -------------------------------------------------------------------------- */

const grantSchema = z.object({
  userId: z.string().min(1).max(100),
  planId: uuid,
  durationDays: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 3650), 'Duração entre 1 e 3650 dias'),
  note: optionalText(280),
})

export async function grantMembership(input: z.input<typeof grantSchema>): Promise<ActionResult> {
  try {
    await assertPermission('members:manage')
    const data = grantSchema.parse(input)
    const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, data.userId)).limit(1)
    if (!target) return fail('Usuário não encontrado.')
    const [p] = await db.select({ id: plan.id }).from(plan).where(eq(plan.id, data.planId)).limit(1)
    if (!p) return fail('Plano não encontrado.')
    await db.insert(membership).values({
      userId: target.id,
      planId: p.id,
      status: 'ACTIVE',
      source: 'MANUAL',
      endsAt: data.durationDays ? new Date(Date.now() + data.durationDays * 86_400_000) : null,
      note: data.note,
    })
    refresh()
    return ok(undefined, 'Acesso concedido')
  } catch (error) {
    return handleActionError(error)
  }
}

export async function revokeMembership(membershipId: string): Promise<ActionResult> {
  try {
    await assertPermission('members:manage')
    const updated = await db
      .update(membership)
      .set({ status: 'CANCELED', endsAt: new Date() })
      .where(eq(membership.id, uuid.parse(membershipId)))
      .returning({ id: membership.id })
    if (!updated.length) return fail('Acesso não encontrado.')
    refresh()
    return ok(undefined, 'Acesso revogado')
  } catch (error) {
    return handleActionError(error)
  }
}

export async function setUserRole(userId: string, role: string): Promise<ActionResult> {
  try {
    const viewer = await assertPermission('members:manage')
    if (!isRole(role)) return fail('Papel inválido.')
    if (userId === viewer.id) return fail('Você não pode alterar o próprio papel.')
    const updated = await db.update(user).set({ role }).where(eq(user.id, userId)).returning({ id: user.id })
    if (!updated.length) return fail('Usuário não encontrado.')
    refresh()
    return ok(undefined, 'Papel atualizado')
  } catch (error) {
    return handleActionError(error)
  }
}

const codesSchema = z.object({
  planId: uuid,
  quantity: z.coerce.number().int().min(1, 'Mínimo 1').max(500, 'Máximo 500 por lote'),
  durationDays: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 3650), 'Duração entre 1 e 3650 dias'),
  maxRedemptions: z.coerce.number().int().min(1).max(10_000).default(1),
  expiresAt: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null))
    .refine((d) => d === null || (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()), 'A validade precisa ser uma data futura'),
  note: optionalText(280),
})

/** Gera códigos de acesso. O texto puro é retornado UMA vez; o banco guarda apenas o hash. */
export async function generateAccessCodes(input: z.input<typeof codesSchema>): Promise<ActionResult<{ codes: string[] }>> {
  try {
    const viewer = await assertPermission('codes:manage')
    const data = codesSchema.parse(input)
    const [p] = await db.select({ id: plan.id }).from(plan).where(eq(plan.id, data.planId)).limit(1)
    if (!p) return fail('Plano não encontrado.')
    const codes = Array.from({ length: data.quantity }, () => generateAccessCode())
    await db.insert(accessCode).values(
      codes.map((code) => ({
        codeHash: hashAccessCode(code),
        codeHint: accessCodeHint(code),
        planId: p.id,
        durationDays: data.durationDays,
        maxRedemptions: data.maxRedemptions,
        expiresAt: data.expiresAt,
        note: data.note,
        createdById: viewer.id,
      })),
    )
    refresh()
    return ok({ codes }, `${codes.length} código(s) gerado(s)`)
  } catch (error) {
    return handleActionError(error)
  }
}

export async function disableAccessCode(id: string): Promise<ActionResult> {
  try {
    await assertPermission('codes:manage')
    const updated = await db
      .update(accessCode)
      .set({ disabledAt: new Date() })
      .where(eq(accessCode.id, uuid.parse(id)))
      .returning({ id: accessCode.id })
    if (!updated.length) return fail('Código não encontrado.')
    refresh()
    return ok(undefined, 'Código desativado')
  } catch (error) {
    return handleActionError(error)
  }
}

/* -------------------------------------------------------------------------- */
/* Novidades                                                                  */
/* -------------------------------------------------------------------------- */

const updateSchema = z.object({
  id: uuid.optional(),
  title: requiredText(160, 'Título'),
  body: z.string().trim().max(1000).default(''),
  kind: z.enum(['NEW_CONTENT', 'FEATURE', 'ANNOUNCEMENT']),
  contentId: optionalUuid,
  state: z.enum(['DRAFT', 'PUBLISHED']),
})

export async function saveLabUpdate(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  try {
    await assertPermission('updates:write')
    const data = updateSchema.parse(input)
    if (data.contentId) {
      const [c] = await db.select({ id: contentItem.id }).from(contentItem).where(eq(contentItem.id, data.contentId)).limit(1)
      if (!c) return fail('Conteúdo vinculado não encontrado.')
    }
    const values = {
      title: data.title,
      body: data.body,
      kind: data.kind,
      contentId: data.contentId,
      state: data.state,
      publishedAt: data.state === 'PUBLISHED' ? sql`coalesce(${labUpdate.publishedAt}, now())` : labUpdate.publishedAt,
    }
    if (data.id) {
      const updated = await db.update(labUpdate).set(values).where(eq(labUpdate.id, data.id)).returning({ id: labUpdate.id })
      if (!updated.length) return fail('Novidade não encontrada.')
    } else {
      await db.insert(labUpdate).values({ ...values, publishedAt: data.state === 'PUBLISHED' ? new Date() : null })
    }
    refresh()
    return ok(undefined, 'Novidade salva')
  } catch (error) {
    return handleActionError(error)
  }
}

export async function deleteLabUpdate(id: string): Promise<ActionResult> {
  try {
    await assertPermission('updates:write')
    const removed = await db.delete(labUpdate).where(eq(labUpdate.id, uuid.parse(id))).returning({ id: labUpdate.id })
    if (!removed.length) return fail('Novidade não encontrada.')
    refresh()
    return ok(undefined, 'Novidade removida')
  } catch (error) {
    return handleActionError(error)
  }
}
