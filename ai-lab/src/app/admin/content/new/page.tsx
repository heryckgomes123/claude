import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentEditor } from '@/features/admin/content-editor'
import { emptyEditorState } from '@/features/admin/editor-types'
import { CONTENT_TYPE_META, CONTENT_TYPES, type ContentType } from '@/lib/labels'
import { requirePermission } from '@/server/auth/viewer'
import { getEditorOptions } from '@/server/queries/admin'

export const metadata: Metadata = { title: 'Novo conteúdo' }

export default async function NewContentPage({ searchParams }: PageProps<'/admin/content/new'>) {
  await requirePermission('content:write')
  const { type: rawType } = await searchParams
  const type: ContentType = (CONTENT_TYPES as readonly string[]).includes(String(rawType)) ? (rawType as ContentType) : 'PROMPT'
  const options = await getEditorOptions()
  return (
    <div className="grid gap-6">
      <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-bone">
        <ArrowLeft className="size-4" aria-hidden /> Conteúdo
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Novo {CONTENT_TYPE_META[type].label.toLowerCase()}</h1>
        <nav aria-label="Tipo" className="flex flex-wrap gap-1.5">
          {CONTENT_TYPES.map((t) => (
            <Link
              key={t}
              href={`/admin/content/new?type=${t}`}
              aria-current={t === type ? 'page' : undefined}
              className={t === type ? 'rounded-full bg-bone/[0.08] px-3 py-1 text-sm text-bone' : 'rounded-full px-3 py-1 text-sm text-mute hover:text-bone'}
            >
              {CONTENT_TYPE_META[t].label}
            </Link>
          ))}
        </nav>
      </div>
      <ContentEditor key={type} initial={emptyEditorState(type)} options={options} />
    </div>
  )
}
