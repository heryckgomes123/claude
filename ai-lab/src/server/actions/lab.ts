'use server'
import { and, eq, sql } from 'drizzle-orm'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { fillVariables } from '@/lib/prompt-variables'
import { collectionSchema, optionalText, optionalUrl, requiredText, userPromptSchema, uuid } from '@/lib/validation'
import { ENTITLEMENTS } from '../access/entitlements'
import { assertMember } from '../auth/viewer'
import { db } from '../db'
import {
  collection,
  collectionItem,
  contentItem,
  experiment,
  experimentVariant,
  favorite,
  prompt,
  userPrompt,
} from '../db/schema'
import { recordHistory } from '../history'
import { consumeRateLimit } from '../rate-limit'
import { fail, handleActionError, ok, type ActionResult } from './result'

async function publishedContent(contentId: string) {
  const [row] = await db
    .select({ id: contentItem.id, type: contentItem.type, title: contentItem.title })
    .from(contentItem)
    .where(and(eq(contentItem.id, contentId), eq(contentItem.status, 'PUBLISHED')))
    .limit(1)
  return row ?? null
}

/* -------------------------------------------------------------------------- */
/* Favoritos                                                                  */
/* -------------------------------------------------------------------------- */

export async function toggleFavorite(contentId: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const viewer = await assertMember()
    const id = uuid.parse(contentId)
    if (!(await publishedContent(id))) return fail('Conteúdo não encontrado.')

    const favorited = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(favorite)
        .values({ userId: viewer.id, contentId: id })
        .onConflictDoNothing()
        .returning({ contentId: favorite.contentId })
      if (inserted.length) {
        await tx
          .update(contentItem)
          .set({ favoriteCount: sql`${contentItem.favoriteCount} + 1`, updatedAt: sql`${contentItem.updatedAt}` })
          .where(eq(contentItem.id, id))
        return true
      }
      const removed = await tx
        .delete(favorite)
        .where(and(eq(favorite.userId, viewer.id), eq(favorite.contentId, id)))
        .returning({ contentId: favorite.contentId })
      if (removed.length)
        await tx
          .update(contentItem)
          .set({ favoriteCount: sql`greatest(${contentItem.favoriteCount} - 1, 0)`, updatedAt: sql`${contentItem.updatedAt}` })
          .where(eq(contentItem.id, id))
      return false
    })
    refresh()
    return ok({ favorited }, favorited ? 'Salvo nos favoritos' : 'Removido dos favoritos')
  } catch (error) {
    return handleActionError(error)
  }
}

/* -------------------------------------------------------------------------- */
/* Uso                                                                        */
/* -------------------------------------------------------------------------- */

export async function recordCopy(contentId: string): Promise<ActionResult> {
  try {
    const viewer = await assertMember()
    const id = uuid.parse(contentId)
    if (!(await consumeRateLimit(`copy:${viewer.id}`, 60, 60))) return ok(undefined)
    if (!(await publishedContent(id))) return fail('Conteúdo não encontrado.')
    await recordHistory(viewer.id, id, 'COPY')
    return ok(undefined)
  } catch (error) {
    return handleActionError(error)
  }
}

/* -------------------------------------------------------------------------- */
/* Coleções                                                                   */
/* -------------------------------------------------------------------------- */

export async function createCollection(input: {
  name: string
  description?: string
}): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const viewer = await assertMember(ENTITLEMENTS.COLLECTIONS)
    const data = collectionSchema.parse(input)
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(collection)
      .where(eq(collection.userId, viewer.id))
    if (total >= 200) return fail('Limite de 200 coleções atingido.')
    const [created] = await db
      .insert(collection)
      .values({ userId: viewer.id, name: data.name, description: data.description })
      .returning({ id: collection.id, name: collection.name })
    refresh()
    return ok(created, 'Coleção criada')
  } catch (error) {
    const result = handleActionError(error)
    return !result.ok && result.error.startsWith('Já existe') ? fail('Você já tem uma coleção com esse nome.') : result
  }
}

export async function updateCollection(input: { id: string; name: string; description?: string }): Promise<ActionResult> {
  try {
    const viewer = await assertMember(ENTITLEMENTS.COLLECTIONS)
    const id = uuid.parse(input.id)
    const data = collectionSchema.parse(input)
    const updated = await db
      .update(collection)
      .set({ name: data.name, description: data.description })
      .where(and(eq(collection.id, id), eq(collection.userId, viewer.id)))
      .returning({ id: collection.id })
    if (!updated.length) return fail('Coleção não encontrada.')
    refresh()
    return ok(undefined, 'Coleção atualizada')
  } catch (error) {
    const result = handleActionError(error)
    return !result.ok && result.error.startsWith('Já existe') ? fail('Você já tem uma coleção com esse nome.') : result
  }
}

export async function deleteCollection(collectionId: string): Promise<ActionResult> {
  try {
    const viewer = await assertMember(ENTITLEMENTS.COLLECTIONS)
    const id = uuid.parse(collectionId)
    const removed = await db
      .delete(collection)
      .where(and(eq(collection.id, id), eq(collection.userId, viewer.id)))
      .returning({ id: collection.id })
    if (!removed.length) return fail('Coleção não encontrada.')
  } catch (error) {
    return handleActionError(error)
  }
  redirect('/lab/my-lab?tab=collections')
}

const collectionTargetSchema = z
  .object({
    collectionId: uuid,
    contentId: uuid.optional(),
    userPromptId: uuid.optional(),
    include: z.boolean(),
  })
  .refine((v) => Boolean(v.contentId) !== Boolean(v.userPromptId), 'Alvo inválido')

export async function setCollectionItem(input: z.input<typeof collectionTargetSchema>): Promise<ActionResult> {
  try {
    const viewer = await assertMember(ENTITLEMENTS.COLLECTIONS)
    const data = collectionTargetSchema.parse(input)

    const [owned] = await db
      .select({ id: collection.id })
      .from(collection)
      .where(and(eq(collection.id, data.collectionId), eq(collection.userId, viewer.id)))
      .limit(1)
    if (!owned) return fail('Coleção não encontrada.')

    if (data.contentId && !(await publishedContent(data.contentId))) return fail('Conteúdo não encontrado.')
    if (data.userPromptId) {
      const [mine] = await db
        .select({ id: userPrompt.id })
        .from(userPrompt)
        .where(and(eq(userPrompt.id, data.userPromptId), eq(userPrompt.userId, viewer.id)))
        .limit(1)
      if (!mine) return fail('Prompt não encontrado.')
    }

    const target = data.contentId
      ? eq(collectionItem.contentId, data.contentId)
      : eq(collectionItem.userPromptId, data.userPromptId!)
    if (data.include) {
      await db
        .insert(collectionItem)
        .values({ collectionId: owned.id, contentId: data.contentId ?? null, userPromptId: data.userPromptId ?? null })
        .onConflictDoNothing()
    } else {
      await db.delete(collectionItem).where(and(eq(collectionItem.collectionId, owned.id), target))
    }
    await db.update(collection).set({ updatedAt: new Date() }).where(eq(collection.id, owned.id))
    refresh()
    return ok(undefined, data.include ? 'Adicionado à coleção' : 'Removido da coleção')
  } catch (error) {
    return handleActionError(error)
  }
}

/* -------------------------------------------------------------------------- */
/* Prompts do usuário                                                         */
/* -------------------------------------------------------------------------- */

const builderStateSchema = z.record(z.string().max(40), z.string().max(2000)).optional()

const saveUserPromptSchema = userPromptSchema.extend({
  id: uuid.optional(),
  builderState: builderStateSchema,
  isFavorite: z.boolean().optional(),
})

export async function saveUserPrompt(input: z.input<typeof saveUserPromptSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const viewer = await assertMember()
    const data = saveUserPromptSchema.parse(input)
    if (data.builderState && !(viewer.isAdmin || viewer.entitlements.has(ENTITLEMENTS.PROMPT_BUILDER)))
      return fail('Seu plano não inclui o Prompt Builder.')
    if (!(await consumeRateLimit(`user-prompt:${viewer.id}`, 60, 60))) return fail('Muitas alterações seguidas. Aguarde um instante.')

    const values = {
      title: data.title,
      body: data.body,
      negativePrompt: data.negativePrompt,
      notes: data.notes,
      ...(data.builderState ? { builderState: data.builderState } : {}),
      ...(data.isFavorite !== undefined ? { isFavorite: data.isFavorite } : {}),
    }

    if (data.id) {
      const updated = await db
        .update(userPrompt)
        .set(values)
        .where(and(eq(userPrompt.id, data.id), eq(userPrompt.userId, viewer.id)))
        .returning({ id: userPrompt.id })
      if (!updated.length) return fail('Prompt não encontrado.')
      refresh()
      return ok({ id: updated[0].id }, 'Prompt atualizado')
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(userPrompt)
      .where(eq(userPrompt.userId, viewer.id))
    if (total >= 2000) return fail('Limite de prompts salvos atingido.')

    const [created] = await db
      .insert(userPrompt)
      .values({ ...values, userId: viewer.id })
      .returning({ id: userPrompt.id })
    refresh()
    return ok({ id: created.id }, 'Prompt salvo no Meu Lab')
  } catch (error) {
    return handleActionError(error)
  }
}

const fromContentSchema = z.object({
  contentId: uuid,
  mode: z.enum(['remix', 'duplicate']),
  variables: z.record(z.string().max(60), z.string().max(500)).optional(),
})

/** Remix (cópia com variáveis preenchidas, pronta para editar) ou duplicata exata de um prompt do Lab. */
export async function createPromptFromContent(input: z.input<typeof fromContentSchema>): Promise<ActionResult<{ id: string }>> {
  let createdId: string
  try {
    const viewer = await assertMember()
    const data = fromContentSchema.parse(input)
    const [source] = await db
      .select({ title: contentItem.title, body: prompt.body, negativePrompt: prompt.negativePrompt })
      .from(contentItem)
      .innerJoin(prompt, eq(prompt.contentId, contentItem.id))
      .where(and(eq(contentItem.id, data.contentId), eq(contentItem.status, 'PUBLISHED')))
      .limit(1)
    if (!source) return fail('Prompt não encontrado.')
    if (!(await consumeRateLimit(`user-prompt:${viewer.id}`, 60, 60))) return fail('Muitas alterações seguidas. Aguarde um instante.')

    const body = data.mode === 'remix' ? fillVariables(source.body, data.variables ?? {}) : source.body
    const [created] = await db
      .insert(userPrompt)
      .values({
        userId: viewer.id,
        title: `${data.mode === 'remix' ? 'Remix' : 'Cópia'} — ${source.title}`.slice(0, 140),
        body,
        negativePrompt: source.negativePrompt,
        sourceContentId: data.contentId,
      })
      .returning({ id: userPrompt.id })
    createdId = created.id
  } catch (error) {
    return handleActionError(error)
  }
  redirect(`/lab/my-lab/prompts/${createdId}`)
}

export async function deleteUserPrompt(id: string): Promise<ActionResult> {
  try {
    const viewer = await assertMember()
    const promptId = uuid.parse(id)
    const removed = await db
      .delete(userPrompt)
      .where(and(eq(userPrompt.id, promptId), eq(userPrompt.userId, viewer.id)))
      .returning({ id: userPrompt.id })
    if (!removed.length) return fail('Prompt não encontrado.')
  } catch (error) {
    return handleActionError(error)
  }
  redirect('/lab/my-lab?tab=prompts')
}

export async function toggleUserPromptFavorite(id: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const viewer = await assertMember()
    const promptId = uuid.parse(id)
    const [row] = await db
      .update(userPrompt)
      .set({ isFavorite: sql`not ${userPrompt.isFavorite}` })
      .where(and(eq(userPrompt.id, promptId), eq(userPrompt.userId, viewer.id)))
      .returning({ isFavorite: userPrompt.isFavorite })
    if (!row) return fail('Prompt não encontrado.')
    refresh()
    return ok({ favorited: row.isFavorite })
  } catch (error) {
    return handleActionError(error)
  }
}

/* -------------------------------------------------------------------------- */
/* Experimentos                                                               */
/* -------------------------------------------------------------------------- */

const variantSchema = z.object({
  label: requiredText(24, 'Rótulo'),
  prompt: requiredText(8000, 'Prompt'),
  parameters: optionalText(1000),
  observations: optionalText(4000),
  result: optionalText(4000),
  resultUrl: optionalUrl,
  score: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 10), 'Nota de 0 a 10'),
})

const experimentSchema = z.object({
  id: uuid.optional(),
  title: requiredText(140, 'Título'),
  objective: z.string().trim().max(2000).default(''),
  toolId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(uuid.nullable()),
  sourcePromptId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(uuid.nullable()),
  notes: optionalText(6000),
  variants: z.array(variantSchema).min(1, 'Adicione pelo menos uma variante').max(6, 'Máximo de 6 variantes'),
})

export type ExperimentInput = z.input<typeof experimentSchema>

export async function saveExperiment(input: ExperimentInput): Promise<ActionResult<{ id: string }>> {
  let savedId: string
  try {
    const viewer = await assertMember(ENTITLEMENTS.EXPERIMENTS)
    const data = experimentSchema.parse(input)
    if (!(await consumeRateLimit(`experiment:${viewer.id}`, 30, 60))) return fail('Muitas alterações seguidas. Aguarde um instante.')

    // Vínculos só com conteúdo publicado do tipo correto.
    for (const [id, type] of [
      [data.toolId, 'TOOL'],
      [data.sourcePromptId, 'PROMPT'],
    ] as const) {
      if (!id) continue
      const item = await publishedContent(id)
      if (!item || item.type !== type) return fail('Vínculo inválido.', { [type === 'TOOL' ? 'toolId' : 'sourcePromptId']: 'Selecione uma opção válida' })
    }

    savedId = await db.transaction(async (tx) => {
      const values = {
        title: data.title,
        objective: data.objective,
        toolId: data.toolId,
        sourcePromptId: data.sourcePromptId,
        notes: data.notes,
      }
      let id: string
      if (data.id) {
        const [updated] = await tx
          .update(experiment)
          .set(values)
          .where(and(eq(experiment.id, data.id), eq(experiment.userId, viewer.id)))
          .returning({ id: experiment.id })
        if (!updated) throw new Error('NOT_FOUND')
        id = updated.id
        await tx.delete(experimentVariant).where(eq(experimentVariant.experimentId, id))
      } else {
        const [created] = await tx
          .insert(experiment)
          .values({ ...values, userId: viewer.id })
          .returning({ id: experiment.id })
        id = created.id
      }
      await tx.insert(experimentVariant).values(data.variants.map((v, position) => ({ ...v, position, experimentId: id })))
      return id
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return fail('Experimento não encontrado.')
    return handleActionError(error)
  }
  redirect(`/lab/experiments/${savedId}`)
}

export async function deleteExperiment(id: string): Promise<ActionResult> {
  try {
    const viewer = await assertMember(ENTITLEMENTS.EXPERIMENTS)
    const experimentId = uuid.parse(id)
    const removed = await db
      .delete(experiment)
      .where(and(eq(experiment.id, experimentId), eq(experiment.userId, viewer.id)))
      .returning({ id: experiment.id })
    if (!removed.length) return fail('Experimento não encontrado.')
  } catch (error) {
    return handleActionError(error)
  }
  redirect('/lab/experiments')
}
