import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/admin/status-badge'
import { ContentEditor } from '@/features/admin/content-editor'
import { toEditorState } from '@/features/admin/editor-state'
import { CONTENT_TYPE_META } from '@/lib/labels'
import { formatDate } from '@/lib/utils'
import { requirePermission } from '@/server/auth/viewer'
import { getContentForEdit, getEditorOptions } from '@/server/queries/admin'

export const metadata: Metadata = { title: 'Editar conteúdo' }

export default async function EditContentPage({ params, searchParams }: PageProps<'/admin/content/[id]'>) {
  await requirePermission('content:write')
  const { id } = await params
  const { created } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [content, options] = await Promise.all([getContentForEdit(id), getEditorOptions()])
  if (!content) notFound()

  return (
    <div className="grid gap-6">
      <Link href={`/admin/content?type=${content.type}`} className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-bone">
        <ArrowLeft className="size-4" aria-hidden /> {CONTENT_TYPE_META[content.type].plural}
      </Link>
      {created === '1' && (
        <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
          Conteúdo criado. Continue editando ou publique quando estiver pronto.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
        <StatusBadge status={content.status} />
        <span className="text-xs text-mute-600">
          criado {formatDate(content.createdAt)} · {content.viewCount} visualizações · {content.useCount} usos · {content.favoriteCount} favoritos
        </span>
      </div>
      <ContentEditor
        key={content.updatedAt.toISOString()}
        initial={toEditorState(content)}
        options={options}
        slugLocked
        versions={'versions' in content ? content.versions : undefined}
        published={{ slug: content.slug }}
      />
    </div>
  )
}
