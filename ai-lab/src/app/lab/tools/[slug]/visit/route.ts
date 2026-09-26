import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { safeExternalUrl } from '@/lib/utils'
import { getViewer } from '@/server/auth/viewer'
import { db } from '@/server/db'
import { contentItem, tool } from '@/server/db/schema'
import { recordHistory } from '@/server/history'

export const dynamic = 'force-dynamic'

/**
 * Registra o acesso ao site da ferramenta e redireciona.
 * O destino vem do banco (nunca da URL), então não há open redirect.
 */
export async function GET(request: Request, { params }: RouteContext<'/lab/tools/[slug]/visit'>) {
  const { slug } = await params
  const viewer = await getViewer()
  if (!viewer?.hasLabAccess) return NextResponse.redirect(new URL('/entrar', request.url))
  if (!/^[a-z0-9-]{1,96}$/.test(slug)) return new NextResponse('Not found', { status: 404 })

  const [row] = await db
    .select({ id: contentItem.id, websiteUrl: tool.websiteUrl })
    .from(contentItem)
    .innerJoin(tool, eq(tool.contentId, contentItem.id))
    .where(and(eq(contentItem.type, 'TOOL'), eq(contentItem.slug, slug), eq(contentItem.status, 'PUBLISHED')))
    .limit(1)
  const target = safeExternalUrl(row?.websiteUrl)
  if (!row || !target) return new NextResponse('Not found', { status: 404 })

  await recordHistory(viewer.id, row.id, 'VISIT')
  return NextResponse.redirect(target, { status: 302 })
}
