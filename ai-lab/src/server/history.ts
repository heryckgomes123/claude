import 'server-only'
import { and, eq, gt, sql } from 'drizzle-orm'
import { db } from './db'
import { contentItem, historyEvent } from './db/schema'

type Action = 'VIEW' | 'COPY' | 'VISIT'

/**
 * Registra uso para "Continue de onde parou" e popularidade.
 * VIEW é deduplicado por 30 min para não inflar contadores com recarregamentos.
 */
export async function recordHistory(userId: string, contentId: string, action: Action) {
  try {
    if (action === 'VIEW') {
      const [recent] = await db
        .select({ id: historyEvent.id })
        .from(historyEvent)
        .where(
          and(
            eq(historyEvent.userId, userId),
            eq(historyEvent.contentId, contentId),
            eq(historyEvent.action, 'VIEW'),
            gt(historyEvent.createdAt, sql`now() - interval '30 minutes'`),
          ),
        )
        .limit(1)
      if (recent) return
    }
    await db.insert(historyEvent).values({ userId, contentId, action })
    const counter = action === 'VIEW' ? contentItem.viewCount : contentItem.useCount
    await db
      .update(contentItem)
      .set({ [action === 'VIEW' ? 'viewCount' : 'useCount']: sql`${counter} + 1`, updatedAt: sql`${contentItem.updatedAt}` })
      .where(eq(contentItem.id, contentId))
  } catch (error) {
    // Histórico nunca deve quebrar a navegação.
    console.error('[history]', error)
  }
}
