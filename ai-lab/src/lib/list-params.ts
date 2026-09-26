import { z } from 'zod'
import { DIFFICULTIES, MEDIA_TYPES, PRICING_STATUSES, SORTS, TIME_BUCKETS } from './labels'

type RawParams = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const slugLike = z.string().regex(/^[a-z0-9-]{1,96}$/)

function pick<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const parsed = schema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** Converte searchParams em filtros válidos. Valores inválidos são ignorados — nunca quebram a página. */
export function parseListParams(raw: RawParams) {
  const q = first(raw.q)?.trim().slice(0, 120) || undefined
  const page = pick(z.coerce.number().int().min(1).max(500), first(raw.page)) ?? 1
  return {
    q,
    page,
    category: pick(slugLike, first(raw.category)),
    tag: pick(slugLike, first(raw.tag)),
    tool: pick(slugLike, first(raw.tool)),
    difficulty: pick(z.enum(DIFFICULTIES), first(raw.difficulty)),
    media: pick(z.enum(MEDIA_TYPES), first(raw.media)),
    pricing: pick(z.enum(PRICING_STATUSES), first(raw.pricing)),
    time: pick(z.enum(TIME_BUCKETS), first(raw.time)),
    sort: pick(z.enum(SORTS), first(raw.sort)),
  }
}

export type ParsedListParams = ReturnType<typeof parseListParams>

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}
