import 'server-only'
import { after } from 'next/server'
import { notFound } from 'next/navigation'
import type { ContentType } from '@/lib/labels'
import { requireMember, viewerHas } from '@/server/auth/viewer'
import type { Entitlement } from '@/server/access/entitlements'
import { recordHistory } from '@/server/history'
import { getContentMeta, getRelated, groupRelated, isFavorited } from '@/server/queries/content'
import { getMembershipInCollections, listCollections } from '@/server/queries/user-space'

/**
 * Dados comuns das páginas de detalhe. Admins podem pré-visualizar rascunhos (com aviso).
 * O registro de histórico roda depois da resposta (after), sem atrasar a página.
 */
export async function getDetailContext(type: ContentType, slug: string) {
  const viewer = await requireMember()
  if (!/^[a-z0-9-]{1,96}$/.test(slug)) notFound()
  const meta = await getContentMeta(type, slug, { includeUnpublished: viewer.isAdmin })
  if (!meta) notFound()

  const locked = Boolean(meta.requiredEntitlement) && !viewerHas(viewer, meta.requiredEntitlement as Entitlement)

  const [favorited, related, collections, inCollections] = await Promise.all([
    isFavorited(viewer.id, meta.id),
    getRelated(meta.id),
    listCollections(viewer.id),
    getMembershipInCollections(viewer.id, { contentId: meta.id }),
  ])

  if (meta.status === 'PUBLISHED') after(() => recordHistory(viewer.id, meta.id, 'VIEW'))

  return {
    viewer,
    meta,
    locked,
    favorited,
    related: groupRelated(related),
    collections: collections.map((c) => ({ id: c.id, name: c.name, included: inCollections.includes(c.id) })),
    canUseCollections: viewerHas(viewer, 'lab.collections'),
  }
}

export type DetailContext = Awaited<ReturnType<typeof getDetailContext>>

/** Título da aba para páginas de detalhe (apenas para membros; nunca expõe rascunhos). */
export async function detailMetadata(type: ContentType, slug: string): Promise<{ title: string }> {
  const { getViewer } = await import('@/server/auth/viewer')
  const viewer = await getViewer()
  if (!viewer?.hasLabAccess || !/^[a-z0-9-]{1,96}$/.test(slug)) return { title: 'INTELRA AI LAB' }
  const meta = await getContentMeta(type, slug)
  return { title: meta?.title ?? 'Não encontrado' }
}
