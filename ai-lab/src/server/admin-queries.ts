import 'server-only'
import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { accessGrant, lesson, lessonProgress, lessonPrompt, prompt, tool, user, webhookEvent } from './db/schema'

export async function adminOverview() {
  const [[students], [prompts], [lessons], [tools], [sales], recent, top] = await Promise.all([
    db.select({ total: count() }).from(accessGrant).where(eq(accessGrant.status, 'ACTIVE')),
    db.select({ total: count() }).from(prompt),
    db.select({ total: count() }).from(lesson),
    db.select({ total: count() }).from(tool),
    db
      .select({ total: count() })
      .from(webhookEvent)
      .where(and(eq(webhookEvent.outcome, 'GRANTED'), sql`${webhookEvent.createdAt} > now() - interval '30 days'`)),
    listWebhookEvents(5),
    db
      .select({ id: prompt.id, title: prompt.title, copyCount: prompt.copyCount })
      .from(prompt)
      .where(sql`${prompt.copyCount} > 0`)
      .orderBy(desc(prompt.copyCount))
      .limit(5),
  ])
  return {
    activeStudents: students.total,
    prompts: prompts.total,
    lessons: lessons.total,
    tools: tools.total,
    salesLast30: sales.total,
    recentEvents: recent,
    topPrompts: top,
  }
}

export async function adminPrompts() {
  return db
    .select({
      id: prompt.id,
      slug: prompt.slug,
      title: prompt.title,
      category: prompt.category,
      published: prompt.published,
      imageId: prompt.imageId,
      copyCount: prompt.copyCount,
      position: prompt.position,
    })
    .from(prompt)
    .orderBy(asc(prompt.position), desc(prompt.createdAt))
}

export async function adminPrompt(id: string) {
  const [row] = await db.select().from(prompt).where(eq(prompt.id, id)).limit(1)
  return row ?? null
}

export async function adminCategories(): Promise<string[]> {
  const rows = await db.selectDistinct({ name: prompt.category }).from(prompt).orderBy(asc(prompt.category))
  return rows.map((r) => r.name)
}

export async function adminLessons() {
  return db
    .select({
      id: lesson.id,
      slug: lesson.slug,
      module: lesson.module,
      title: lesson.title,
      published: lesson.published,
      videoUrl: lesson.videoUrl,
      position: lesson.position,
      completions: sql<number>`(select count(*)::int from ${lessonProgress} where ${lessonProgress.lessonId} = ${lesson.id})`,
    })
    .from(lesson)
    .orderBy(asc(lesson.position), asc(lesson.createdAt))
}

export async function adminLesson(id: string) {
  const [row] = await db.select().from(lesson).where(eq(lesson.id, id)).limit(1)
  if (!row) return null
  const links = await db.select({ promptId: lessonPrompt.promptId }).from(lessonPrompt).where(eq(lessonPrompt.lessonId, id))
  return { ...row, promptIds: links.map((l) => l.promptId) }
}

export async function adminModules(): Promise<string[]> {
  const rows = await db.selectDistinct({ name: lesson.module }).from(lesson).orderBy(asc(lesson.module))
  return rows.map((r) => r.name)
}

export async function adminPromptOptions() {
  return db
    .select({ id: prompt.id, title: prompt.title, category: prompt.category })
    .from(prompt)
    .orderBy(asc(prompt.category), asc(prompt.title))
}

export async function adminTools() {
  return db.select().from(tool).orderBy(asc(tool.position), asc(tool.name))
}

export async function adminTool(id: string) {
  const [row] = await db.select().from(tool).where(eq(tool.id, id)).limit(1)
  return row ?? null
}

export async function adminToolCategories(): Promise<string[]> {
  const rows = await db.selectDistinct({ name: tool.category }).from(tool).orderBy(asc(tool.category))
  return rows.map((r) => r.name)
}

/** Progresso por e-mail de aluno (aulas concluídas). */
export async function progressByEmail(): Promise<Map<string, number>> {
  const rows = await db
    .select({ email: user.email, done: count(lessonProgress.lessonId) })
    .from(user)
    .leftJoin(lessonProgress, eq(lessonProgress.userId, user.id))
    .groupBy(user.email)
  return new Map(rows.map((r) => [r.email, r.done]))
}

export async function listWebhookEvents(limit = 50) {
  return db.select().from(webhookEvent).orderBy(desc(webhookEvent.createdAt)).limit(limit)
}
