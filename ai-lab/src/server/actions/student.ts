'use server'
import { and, eq, sql } from 'drizzle-orm'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { assertMember } from '../auth/viewer'
import { db } from '../db'
import { favorite, lesson, lessonProgress, prompt } from '../db/schema'
import { consumeRateLimit } from '../rate-limit'
import { fail, handleActionError, ok, type ActionResult } from './result'

const id = z.uuid()

export async function toggleFavorite(promptId: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const viewer = await assertMember()
    const target = id.parse(promptId)
    const [exists] = await db
      .select({ id: prompt.id })
      .from(prompt)
      .where(and(eq(prompt.id, target), eq(prompt.published, true)))
      .limit(1)
    if (!exists) return fail('Prompt não encontrado.')
    const removed = await db
      .delete(favorite)
      .where(and(eq(favorite.userId, viewer.id), eq(favorite.promptId, target)))
      .returning({ promptId: favorite.promptId })
    if (removed.length === 0) await db.insert(favorite).values({ userId: viewer.id, promptId: target }).onConflictDoNothing()
    refresh()
    const favorited = removed.length === 0
    return ok({ favorited }, favorited ? 'Salvo nos favoritos' : 'Removido dos favoritos')
  } catch (error) {
    return handleActionError(error)
  }
}

/** Conta cópias (o professor vê os prompts mais usados). Limitado por aluno. */
export async function recordCopy(promptId: string): Promise<ActionResult> {
  try {
    const viewer = await assertMember()
    const target = id.parse(promptId)
    if (!(await consumeRateLimit(`copy:${viewer.id}:${target}`, 1, 60 * 10))) return ok(undefined)
    await db
      .update(prompt)
      .set({ copyCount: sql`${prompt.copyCount} + 1` })
      .where(eq(prompt.id, target))
    return ok(undefined)
  } catch (error) {
    return handleActionError(error)
  }
}

export async function setLessonDone(lessonId: string, done: boolean): Promise<ActionResult<{ done: boolean }>> {
  try {
    const viewer = await assertMember()
    const target = id.parse(lessonId)
    const [exists] = await db
      .select({ id: lesson.id })
      .from(lesson)
      .where(and(eq(lesson.id, target), eq(lesson.published, true)))
      .limit(1)
    if (!exists) return fail('Aula não encontrada.')
    if (done) await db.insert(lessonProgress).values({ userId: viewer.id, lessonId: target }).onConflictDoNothing()
    else await db.delete(lessonProgress).where(and(eq(lessonProgress.userId, viewer.id), eq(lessonProgress.lessonId, target)))
    refresh()
    return ok({ done }, done ? 'Aula concluída' : 'Aula marcada como não concluída')
  } catch (error) {
    return handleActionError(error)
  }
}
