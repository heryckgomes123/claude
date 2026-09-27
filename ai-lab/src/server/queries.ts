import 'server-only'
import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm'
import { db } from './db'
import { favorite, lesson, lessonProgress, lessonPrompt, prompt, tool } from './db/schema'

/* --------------------------------- Prompts --------------------------------- */

const promptCard = {
  id: prompt.id,
  slug: prompt.slug,
  title: prompt.title,
  category: prompt.category,
  description: prompt.description,
  tools: prompt.tools,
  imageId: prompt.imageId,
  body: prompt.body,
}

export type PromptCard = {
  id: string
  slug: string
  title: string
  category: string
  description: string
  tools: string | null
  imageId: string | null
  body: string
  isFavorite: boolean
}

function isFavoriteFor(userId: string) {
  return sql<boolean>`exists (select 1 from ${favorite} where ${favorite.userId} = ${userId} and ${favorite.promptId} = ${prompt.id})`
}

/** Busca sem acento em título, descrição, categoria e texto do prompt. */
function promptSearch(q: string) {
  const term = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
  const col = (c: unknown) => sql`intelra_unaccent(${c})`
  const t = sql`intelra_unaccent(${term})`
  return or(
    sql`${col(prompt.title)} ilike ${t}`,
    sql`${col(prompt.description)} ilike ${t}`,
    sql`${col(prompt.category)} ilike ${t}`,
    sql`${col(prompt.body)} ilike ${t}`,
    sql`${col(prompt.tools)} ilike ${t}`,
  )
}

export async function listPrompts(userId: string, { q, category }: { q?: string; category?: string } = {}): Promise<PromptCard[]> {
  return db
    .select({ ...promptCard, isFavorite: isFavoriteFor(userId) })
    .from(prompt)
    .where(
      and(
        eq(prompt.published, true),
        category ? eq(prompt.category, category) : undefined,
        q?.trim() ? promptSearch(q.trim().slice(0, 100)) : undefined,
      ),
    )
    .orderBy(asc(prompt.position), desc(prompt.createdAt))
}

export async function promptCategories(): Promise<{ name: string; total: number }[]> {
  return db
    .select({ name: prompt.category, total: count() })
    .from(prompt)
    .where(eq(prompt.published, true))
    .groupBy(prompt.category)
    .orderBy(asc(prompt.category))
}

export async function getPrompt(slug: string, userId: string) {
  const [row] = await db
    .select({
      ...promptCard,
      negative: prompt.negative,
      tips: prompt.tips,
      isFavorite: isFavoriteFor(userId),
    })
    .from(prompt)
    .where(and(eq(prompt.slug, slug), eq(prompt.published, true)))
    .limit(1)
  if (!row) return null
  const lessons = await db
    .select({ slug: lesson.slug, title: lesson.title, module: lesson.module })
    .from(lessonPrompt)
    .innerJoin(lesson, eq(lesson.id, lessonPrompt.lessonId))
    .where(and(eq(lessonPrompt.promptId, row.id), eq(lesson.published, true)))
    .orderBy(asc(lesson.position))
  return { ...row, lessons }
}

export async function listFavorites(userId: string): Promise<PromptCard[]> {
  return db
    .select({ ...promptCard, isFavorite: sql<boolean>`true` })
    .from(favorite)
    .innerJoin(prompt, eq(prompt.id, favorite.promptId))
    .where(and(eq(favorite.userId, userId), eq(prompt.published, true)))
    .orderBy(desc(favorite.createdAt))
}

/* ---------------------------------- Aulas ---------------------------------- */

export type LessonItem = {
  id: string
  slug: string
  module: string
  title: string
  summary: string
  durationMin: number | null
  done: boolean
}

export async function listLessons(userId: string): Promise<LessonItem[]> {
  return db
    .select({
      id: lesson.id,
      slug: lesson.slug,
      module: lesson.module,
      title: lesson.title,
      summary: lesson.summary,
      durationMin: lesson.durationMin,
      done: sql<boolean>`exists (select 1 from ${lessonProgress} where ${lessonProgress.userId} = ${userId} and ${lessonProgress.lessonId} = ${lesson.id})`,
    })
    .from(lesson)
    .where(eq(lesson.published, true))
    .orderBy(asc(lesson.position), asc(lesson.createdAt))
}

/** Agrupa aulas por módulo, mantendo a ordem da primeira aula de cada módulo. */
export function groupByModule<T extends { module: string }>(items: T[]): { module: string; items: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const list = groups.get(item.module) ?? []
    list.push(item)
    groups.set(item.module, list)
  }
  return [...groups.entries()].map(([module, list]) => ({ module, items: list }))
}

export async function getLesson(slug: string, userId: string) {
  const all = await listLessons(userId)
  const index = all.findIndex((l) => l.slug === slug)
  if (index === -1) return null
  const [row] = await db
    .select({ videoUrl: lesson.videoUrl, content: lesson.content, materialUrl: lesson.materialUrl })
    .from(lesson)
    .where(eq(lesson.id, all[index].id))
    .limit(1)
  const prompts = await db
    .select({ ...promptCard, isFavorite: isFavoriteFor(userId) })
    .from(lessonPrompt)
    .innerJoin(prompt, eq(prompt.id, lessonPrompt.promptId))
    .where(and(eq(lessonPrompt.lessonId, all[index].id), eq(prompt.published, true)))
    .orderBy(asc(prompt.position))
  return {
    ...all[index],
    ...row,
    prompts,
    prev: all[index - 1] ?? null,
    next: all[index + 1] ?? null,
    position: index + 1,
    total: all.length,
  }
}

/* ------------------------------- Ferramentas ------------------------------- */

export async function listTools() {
  return db
    .select({
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      category: tool.category,
      description: tool.description,
      url: tool.url,
      howTo: tool.howTo,
    })
    .from(tool)
    .where(eq(tool.published, true))
    .orderBy(asc(tool.position), asc(tool.name))
}

/* ---------------------------------- Início --------------------------------- */

export async function homeData(userId: string) {
  const [lessons, latest, favorites, [promptTotal], [toolTotal]] = await Promise.all([
    listLessons(userId),
    db
      .select({ ...promptCard, isFavorite: isFavoriteFor(userId) })
      .from(prompt)
      .where(eq(prompt.published, true))
      .orderBy(desc(prompt.createdAt), asc(prompt.position))
      .limit(6),
    db.select({ total: count() }).from(favorite).innerJoin(prompt, eq(prompt.id, favorite.promptId)).where(and(eq(favorite.userId, userId), eq(prompt.published, true))),
    db.select({ total: count() }).from(prompt).where(eq(prompt.published, true)),
    db.select({ total: count() }).from(tool).where(eq(tool.published, true)),
  ])
  const done = lessons.filter((l) => l.done).length
  return {
    nextLesson: lessons.find((l) => !l.done) ?? null,
    lessonsDone: done,
    lessonsTotal: lessons.length,
    latest,
    favoriteTotal: favorites[0]?.total ?? 0,
    promptTotal: promptTotal?.total ?? 0,
    toolTotal: toolTotal?.total ?? 0,
  }
}
