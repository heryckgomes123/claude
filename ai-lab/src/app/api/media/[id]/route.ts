import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getViewer } from '@/server/auth/viewer'
import { db } from '@/server/db'
import { media } from '@/server/db/schema'

export const dynamic = 'force-dynamic'

/** Imagens dos prompts — só para quem tem acesso à área de membros. */
export async function GET(_request: Request, ctx: RouteContext<'/api/media/[id]'>) {
  const { id } = await ctx.params
  const viewer = await getViewer()
  if (!viewer?.hasLabAccess) return new Response('Não autorizado', { status: 401 })
  if (!z.uuid().safeParse(id).success) return new Response('Não encontrado', { status: 404 })
  const [row] = await db
    .select({ contentType: media.contentType, data: media.data })
    .from(media)
    .where(eq(media.id, id))
    .limit(1)
  if (!row) return new Response('Não encontrado', { status: 404 })
  return new Response(new Uint8Array(row.data), {
    headers: {
      'content-type': row.contentType,
      // O id muda a cada novo upload, então a imagem pode ficar no cache do navegador.
      'cache-control': 'private, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
    },
  })
}
