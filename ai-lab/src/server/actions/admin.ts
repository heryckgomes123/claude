'use server'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { csvToObjects } from '@/lib/csv'
import { slugify } from '@/lib/utils'
import { grantAccess, normalizeEmail, setGrantStatus } from '../access/grants'
import { assertAdmin } from '../auth/viewer'
import { db } from '../db'
import { lesson, lessonPrompt, media, prompt, tool } from '../db/schema'
import { saveSettings } from '../settings'
import { fail, fromZod, handleActionError, ok, type ActionResult } from './result'

/* --------------------------------- Helpers --------------------------------- */

const text = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres.`)
const required = (max: number, label: string) => text(max).min(1, `${label} é obrigatório.`)
const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => !v || /^https:\/\//i.test(v), 'Use um link completo começando com https://')
  .transform((v) => v || null)
const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean())
const position = z.coerce.number().int().min(0).max(100000).catch(0)

function field(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value : ''
}

/** Slug único na tabela; em caso de repetição acrescenta -2, -3... */
async function uniqueSlug(table: typeof prompt | typeof lesson | typeof tool, base: string, ignoreId?: string) {
  const root = slugify(base) || 'item'
  for (let i = 1; i < 200; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`
    const [taken] = await db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.slug, candidate), ignoreId ? ne(table.id, ignoreId) : undefined))
      .limit(1)
    if (!taken) return candidate
  }
  return `${root}-${Date.now()}`
}

const IMAGE_TYPES: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  'image/gif': (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
}
const MAX_IMAGE_BYTES = 3 * 1024 * 1024

/** Valida pelo conteúdo real do arquivo (não pela extensão) e grava no banco. */
async function storeImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new UserError('A imagem precisa ter no máximo 3 MB.')
  const data = Buffer.from(await file.arrayBuffer())
  const contentType = Object.keys(IMAGE_TYPES).find((type) => IMAGE_TYPES[type](data))
  if (!contentType) throw new UserError('Envie uma imagem JPG, PNG, WEBP ou GIF.')
  const [row] = await db.insert(media).values({ contentType, size: data.length, data }).returning({ id: media.id })
  return row.id
}

class UserError extends Error {}

function catchAll(error: unknown): ActionResult<never> {
  if (error instanceof UserError) return fail(error.message)
  return handleActionError(error)
}

/* --------------------------------- Prompts --------------------------------- */

const promptSchema = z.object({
  title: required(160, 'Título'),
  category: required(60, 'Categoria'),
  description: text(600),
  body: required(8000, 'Texto do prompt'),
  negative: text(2000).transform((v) => v || null),
  tips: text(3000).transform((v) =>
    v
      .split('\n')
      .map((line) => line.replace(/^[•*-]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 12),
  ),
  tools: text(160).transform((v) => v || null),
  published: checkbox,
  position,
})

export async function savePrompt(form: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAdmin()
    const id = field(form, 'id') || null
    if (id && !z.uuid().safeParse(id).success) return fail('Prompt inválido.')
    const parsed = promptSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fromZod(parsed.error)

    const image = form.get('image')
    let imageId: string | null | undefined
    if (image instanceof File && image.size > 0) imageId = await storeImage(image)
    else if (field(form, 'removeImage') === 'on') imageId = null

    if (id) {
      const [current] = await db.select({ imageId: prompt.imageId }).from(prompt).where(eq(prompt.id, id)).limit(1)
      if (!current) return fail('Prompt não encontrado.')
      await db.update(prompt).set({ ...parsed.data, ...(imageId !== undefined && { imageId }) }).where(eq(prompt.id, id))
      if (imageId !== undefined && current.imageId) await db.delete(media).where(eq(media.id, current.imageId))
      refresh()
      return ok({ id }, 'Prompt atualizado')
    }
    const slug = await uniqueSlug(prompt, parsed.data.title)
    const [row] = await db
      .insert(prompt)
      .values({ ...parsed.data, slug, imageId: imageId ?? null })
      .returning({ id: prompt.id })
    refresh()
    return ok({ id: row.id }, 'Prompt criado')
  } catch (error) {
    return catchAll(error)
  }
}

export async function deletePrompt(promptId: string): Promise<ActionResult> {
  try {
    await assertAdmin()
    const id = z.uuid().parse(promptId)
    const [row] = await db.delete(prompt).where(eq(prompt.id, id)).returning({ imageId: prompt.imageId })
    if (row?.imageId) await db.delete(media).where(eq(media.id, row.imageId))
    refresh()
    return ok(undefined, 'Prompt excluído')
  } catch (error) {
    return catchAll(error)
  }
}

/**
 * Importação em lote por CSV (planilha). Colunas aceitas:
 * titulo, categoria, descricao, prompt, negativo, dicas (separadas por |), ferramentas.
 */
export async function importPrompts(csv: string): Promise<ActionResult<{ created: number; skipped: string[] }>> {
  try {
    await assertAdmin()
    if (csv.length > 2_000_000) return fail('Arquivo muito grande (máximo 2 MB).')
    const rows = csvToObjects(csv)
    if (rows.length === 0) return fail('Nenhuma linha encontrada. Confira o cabeçalho da planilha.')
    if (rows.length > 500) return fail('Importe no máximo 500 prompts por vez.')
    const skipped: string[] = []
    let created = 0
    for (const [index, row] of rows.entries()) {
      const parsed = promptSchema.safeParse({
        title: row.titulo ?? row.title ?? '',
        category: row.categoria ?? row.category ?? '',
        description: row.descricao ?? row.description ?? '',
        body: row.prompt ?? row.texto ?? row.body ?? '',
        negative: row.negativo ?? row.negative ?? '',
        tips: (row.dicas ?? row.tips ?? '').split('|').join('\n'),
        tools: row.ferramentas ?? row.ferramenta ?? row.tools ?? '',
        published: 'on',
        position: row.ordem ?? row.position ?? 0,
      })
      if (!parsed.success) {
        skipped.push(`Linha ${index + 2}: ${parsed.error.issues[0]?.message ?? 'dados inválidos'}`)
        continue
      }
      const slug = await uniqueSlug(prompt, parsed.data.title)
      await db.insert(prompt).values({ ...parsed.data, slug })
      created++
    }
    refresh()
    return ok({ created, skipped }, `${created} prompt(s) importado(s)`)
  } catch (error) {
    return catchAll(error)
  }
}

/* ---------------------------------- Aulas ---------------------------------- */

const lessonSchema = z.object({
  title: required(160, 'Título'),
  module: required(80, 'Módulo'),
  summary: text(400),
  videoUrl: optionalUrl,
  content: text(30000),
  materialUrl: optionalUrl,
  durationMin: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().int().min(1).max(600).nullable()),
  published: checkbox,
  position,
})

export async function saveLesson(form: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAdmin()
    const id = field(form, 'id') || null
    if (id && !z.uuid().safeParse(id).success) return fail('Aula inválida.')
    const parsed = lessonSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fromZod(parsed.error)
    const promptIds = z.array(z.uuid()).max(50).catch([]).parse(form.getAll('promptIds'))

    const lessonId = await db.transaction(async (tx) => {
      let target = id
      if (target) {
        const updated = await tx.update(lesson).set(parsed.data).where(eq(lesson.id, target)).returning({ id: lesson.id })
        if (updated.length === 0) throw new UserError('Aula não encontrada.')
      } else {
        const slug = await uniqueSlug(lesson, parsed.data.title)
        const [row] = await tx.insert(lesson).values({ ...parsed.data, slug }).returning({ id: lesson.id })
        target = row.id
      }
      await tx.delete(lessonPrompt).where(eq(lessonPrompt.lessonId, target))
      if (promptIds.length) {
        const valid = await tx.select({ id: prompt.id }).from(prompt).where(inArray(prompt.id, promptIds))
        if (valid.length) await tx.insert(lessonPrompt).values(valid.map((p) => ({ lessonId: target!, promptId: p.id })))
      }
      return target
    })
    refresh()
    return ok({ id: lessonId }, id ? 'Aula atualizada' : 'Aula criada')
  } catch (error) {
    return catchAll(error)
  }
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  try {
    await assertAdmin()
    await db.delete(lesson).where(eq(lesson.id, z.uuid().parse(lessonId)))
    refresh()
    return ok(undefined, 'Aula excluída')
  } catch (error) {
    return catchAll(error)
  }
}

/* ------------------------------- Ferramentas ------------------------------- */

const toolSchema = z.object({
  name: required(80, 'Nome'),
  category: required(60, 'Categoria'),
  description: text(600),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => /^https:\/\/[^\s]+$/i.test(v), 'Use um link completo começando com https://'),
  howTo: text(1000).transform((v) => v || null),
  published: checkbox,
  position,
})

export async function saveTool(form: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAdmin()
    const id = field(form, 'id') || null
    if (id && !z.uuid().safeParse(id).success) return fail('Ferramenta inválida.')
    const parsed = toolSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fromZod(parsed.error)
    if (id) {
      const updated = await db.update(tool).set(parsed.data).where(eq(tool.id, id)).returning({ id: tool.id })
      if (updated.length === 0) return fail('Ferramenta não encontrada.')
      refresh()
      return ok({ id }, 'Ferramenta atualizada')
    }
    const slug = await uniqueSlug(tool, parsed.data.name)
    const [row] = await db.insert(tool).values({ ...parsed.data, slug }).returning({ id: tool.id })
    refresh()
    return ok({ id: row.id }, 'Ferramenta criada')
  } catch (error) {
    return catchAll(error)
  }
}

export async function deleteTool(toolId: string): Promise<ActionResult> {
  try {
    await assertAdmin()
    await db.delete(tool).where(eq(tool.id, z.uuid().parse(toolId)))
    refresh()
    return ok(undefined, 'Ferramenta excluída')
  } catch (error) {
    return catchAll(error)
  }
}

/* ---------------------------------- Alunos --------------------------------- */

const emailSchema = z.email()

/** Libera vários e-mails de uma vez: um por linha, opcionalmente "email, nome". */
export async function grantEmails(input: string): Promise<ActionResult<{ granted: number; invalid: string[] }>> {
  try {
    await assertAdmin()
    const lines = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return fail('Informe pelo menos um e-mail.')
    if (lines.length > 1000) return fail('Libere no máximo 1000 e-mails por vez.')
    const invalid: string[] = []
    let granted = 0
    for (const line of lines) {
      const [rawEmail, ...rest] = line.split(/[,;\t]/)
      const email = normalizeEmail(rawEmail ?? '')
      if (!emailSchema.safeParse(email).success) {
        invalid.push(line.slice(0, 80))
        continue
      }
      await grantAccess({ email, name: rest.join(' ').trim() || null, source: 'MANUAL', note: 'Liberado pelo painel' })
      granted++
    }
    refresh()
    return ok({ granted, invalid }, `${granted} acesso(s) liberado(s)`)
  } catch (error) {
    return catchAll(error)
  }
}

export async function changeGrantStatus(grantId: string, status: 'ACTIVE' | 'REVOKED'): Promise<ActionResult> {
  try {
    await assertAdmin()
    await setGrantStatus(z.uuid().parse(grantId), z.enum(['ACTIVE', 'REVOKED']).parse(status))
    refresh()
    return ok(undefined, status === 'ACTIVE' ? 'Acesso reativado' : 'Acesso bloqueado')
  } catch (error) {
    return catchAll(error)
  }
}

/* ------------------------------ Configurações ------------------------------ */

const settingsSchema = z.object({
  checkoutUrl: optionalUrl.transform((v) => v ?? ''),
  supportUrl: optionalUrl.transform((v) => v ?? ''),
})

export async function updateSettings(form: FormData): Promise<ActionResult> {
  try {
    await assertAdmin()
    const parsed = settingsSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fromZod(parsed.error)
    await saveSettings(parsed.data)
    refresh()
    return ok(undefined, 'Configurações salvas')
  } catch (error) {
    return catchAll(error)
  }
}
