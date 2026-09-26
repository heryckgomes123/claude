import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { CONTENT_TYPES } from '@/lib/labels'
import { getViewer } from '@/server/auth/viewer'
import { consumeRateLimit } from '@/server/rate-limit'
import { getSearchProvider } from '@/server/services/search/postgres'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  q: z.string().trim().max(120).default(''),
  type: z.enum(CONTENT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
})

export async function GET(request: NextRequest) {
  const viewer = await getViewer()
  if (!viewer) return Response.json({ error: 'unauthenticated' }, { status: 401 })
  if (!viewer.hasLabAccess) return Response.json({ error: 'forbidden' }, { status: 403 })

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return Response.json({ error: 'invalid_query' }, { status: 400 })
  const { q, type, limit } = parsed.data
  if (!q) return Response.json({ results: [] })

  if (!(await consumeRateLimit(`search:${viewer.id}`, 120, 60)))
    return Response.json({ error: 'rate_limited' }, { status: 429 })

  try {
    const results = await getSearchProvider().search(q, { types: type ? [type] : undefined, limit })
    return Response.json({ results }, { headers: { 'cache-control': 'private, no-store' } })
  } catch (error) {
    console.error('[search]', error)
    return Response.json({ error: 'search_failed' }, { status: 500 })
  }
}
