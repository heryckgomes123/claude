import 'server-only'
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm'
import type { ContentType } from '@/lib/labels'
import { db } from '../db'
import {
  collection,
  collectionItem,
  contentItem,
  experiment,
  experimentVariant,
  favorite,
  historyEvent,
  userPrompt,
} from '../db/schema'
import { getCardsByIds } from './content'

/** Conteúdos mais recentes por ação, sem repetição (último evento de cada conteúdo). */
export async function getRecentByAction(userId: string, actions: ('VIEW' | 'COPY' | 'VISIT')[], limit = 12) {
  const rows = await db
    .select({ contentId: historyEvent.contentId, last: sql<Date>`max(${historyEvent.createdAt})` })
    .from(historyEvent)
    .innerJoin(contentItem, eq(contentItem.id, historyEvent.contentId))
    .where(
      and(eq(historyEvent.userId, userId), inArray(historyEvent.action, actions), eq(contentItem.status, 'PUBLISHED')),
    )
    .groupBy(historyEvent.contentId)
    .orderBy(desc(sql`max(${historyEvent.createdAt})`))
    .limit(limit)
  return getCardsByIds(
    rows.map((r) => r.contentId),
    userId,
  )
}

export async function getFavoriteCards(userId: string, type?: ContentType, limit = 60) {
  const rows = await db
    .select({ contentId: favorite.contentId })
    .from(favorite)
    .innerJoin(contentItem, eq(contentItem.id, favorite.contentId))
    .where(and(eq(favorite.userId, userId), type ? eq(contentItem.type, type) : undefined))
    .orderBy(desc(favorite.createdAt))
    .limit(limit)
  return getCardsByIds(
    rows.map((r) => r.contentId),
    userId,
  )
}

export async function getFavoriteCounts(userId: string) {
  const rows = await db
    .select({ type: contentItem.type, count: count() })
    .from(favorite)
    .innerJoin(contentItem, eq(contentItem.id, favorite.contentId))
    .where(and(eq(favorite.userId, userId), eq(contentItem.status, 'PUBLISHED')))
    .groupBy(contentItem.type)
  return Object.fromEntries(rows.map((r) => [r.type, r.count])) as Partial<Record<ContentType, number>>
}

export async function listCollections(userId: string) {
  return db
    .select({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      updatedAt: collection.updatedAt,
      itemCount: sql<number>`count(${collectionItem.id})::int`,
    })
    .from(collection)
    .leftJoin(collectionItem, eq(collectionItem.collectionId, collection.id))
    .where(eq(collection.userId, userId))
    .groupBy(collection.id)
    .orderBy(desc(collection.updatedAt))
}

/** Coleção do próprio usuário (null se não existir ou pertencer a outro). */
export async function getCollection(userId: string, collectionId: string) {
  const [row] = await db
    .select()
    .from(collection)
    .where(and(eq(collection.id, collectionId), eq(collection.userId, userId)))
    .limit(1)
  if (!row) return null
  const items = await db
    .select({
      id: collectionItem.id,
      contentId: collectionItem.contentId,
      userPromptId: collectionItem.userPromptId,
      addedAt: collectionItem.addedAt,
    })
    .from(collectionItem)
    .where(eq(collectionItem.collectionId, row.id))
    .orderBy(desc(collectionItem.addedAt))
  const contentIds = items.map((i) => i.contentId).filter((v): v is string => Boolean(v))
  const promptIds = items.map((i) => i.userPromptId).filter((v): v is string => Boolean(v))
  const [cards, prompts] = await Promise.all([
    getCardsByIds(contentIds, userId),
    promptIds.length
      ? db
          .select({ id: userPrompt.id, title: userPrompt.title, body: userPrompt.body, updatedAt: userPrompt.updatedAt })
          .from(userPrompt)
          .where(and(eq(userPrompt.userId, userId), inArray(userPrompt.id, promptIds)))
      : Promise.resolve([]),
  ])
  return { ...row, cards, prompts }
}

/** Em quais coleções do usuário um conteúdo (ou prompt próprio) está. */
export async function getMembershipInCollections(userId: string, target: { contentId?: string; userPromptId?: string }) {
  const rows = await db
    .select({ collectionId: collectionItem.collectionId })
    .from(collectionItem)
    .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
    .where(
      and(
        eq(collection.userId, userId),
        target.contentId ? eq(collectionItem.contentId, target.contentId) : eq(collectionItem.userPromptId, target.userPromptId!),
      ),
    )
  return rows.map((r) => r.collectionId)
}

export async function listUserPrompts(userId: string, limit = 100) {
  return db
    .select({
      id: userPrompt.id,
      title: userPrompt.title,
      body: userPrompt.body,
      isFavorite: userPrompt.isFavorite,
      updatedAt: userPrompt.updatedAt,
      fromBuilder: sql<boolean>`${userPrompt.builderState} is not null`,
      sourceTitle: contentItem.title,
      sourceSlug: contentItem.slug,
    })
    .from(userPrompt)
    .leftJoin(contentItem, eq(contentItem.id, userPrompt.sourceContentId))
    .where(eq(userPrompt.userId, userId))
    .orderBy(desc(userPrompt.isFavorite), desc(userPrompt.updatedAt))
    .limit(limit)
}

export async function getUserPrompt(userId: string, id: string) {
  const [row] = await db
    .select({
      prompt: userPrompt,
      sourceTitle: contentItem.title,
      sourceSlug: contentItem.slug,
      sourceStatus: contentItem.status,
    })
    .from(userPrompt)
    .leftJoin(contentItem, eq(contentItem.id, userPrompt.sourceContentId))
    .where(and(eq(userPrompt.id, id), eq(userPrompt.userId, userId)))
    .limit(1)
  if (!row) return null
  return {
    ...row.prompt,
    source: row.sourceSlug && row.sourceStatus === 'PUBLISHED' ? { title: row.sourceTitle!, slug: row.sourceSlug } : null,
  }
}

export async function listExperiments(userId: string) {
  return db
    .select({
      id: experiment.id,
      title: experiment.title,
      objective: experiment.objective,
      updatedAt: experiment.updatedAt,
      toolTitle: contentItem.title,
      variantCount: sql<number>`(select count(*)::int from experiment_variant v where v.experiment_id = ${experiment.id})`,
      bestScore: sql<number | null>`(select max(v.score) from experiment_variant v where v.experiment_id = ${experiment.id})`,
    })
    .from(experiment)
    .leftJoin(contentItem, eq(contentItem.id, experiment.toolId))
    .where(eq(experiment.userId, userId))
    .orderBy(desc(experiment.updatedAt))
}

export async function getExperiment(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(experiment)
    .where(and(eq(experiment.id, id), eq(experiment.userId, userId)))
    .limit(1)
  if (!row) return null
  const linkedIds = [row.toolId, row.sourcePromptId].filter((v): v is string => Boolean(v))
  const [variants, linked] = await Promise.all([
    db
      .select()
      .from(experimentVariant)
      .where(eq(experimentVariant.experimentId, row.id))
      .orderBy(asc(experimentVariant.position)),
    linkedIds.length
      ? db
          .select({ id: contentItem.id, type: contentItem.type, slug: contentItem.slug, title: contentItem.title, status: contentItem.status })
          .from(contentItem)
          .where(inArray(contentItem.id, linkedIds))
      : Promise.resolve([]),
  ])
  const find = (id: string | null) => {
    const item = linked.find((l) => l.id === id)
    return item && item.status === 'PUBLISHED' ? item : null
  }
  return { ...row, variants, tool: find(row.toolId), sourcePrompt: find(row.sourcePromptId) }
}
