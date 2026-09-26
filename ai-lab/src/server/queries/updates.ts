import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { contentItem, labUpdate } from '../db/schema'

export async function getPublishedUpdates(limit = 4) {
  return db
    .select({
      id: labUpdate.id,
      title: labUpdate.title,
      body: labUpdate.body,
      kind: labUpdate.kind,
      publishedAt: labUpdate.publishedAt,
      contentType: contentItem.type,
      contentSlug: contentItem.slug,
      contentStatus: contentItem.status,
    })
    .from(labUpdate)
    .leftJoin(contentItem, eq(contentItem.id, labUpdate.contentId))
    .where(and(eq(labUpdate.state, 'PUBLISHED')))
    .orderBy(desc(labUpdate.publishedAt))
    .limit(limit)
}
