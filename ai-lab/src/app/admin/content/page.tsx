import { Plus, Star } from 'lucide-react'
import type { Metadata } from 'next'
import Form from 'next/form'
import Link from 'next/link'
import { ContentRowActions } from '@/components/admin/row-actions'
import { StatusBadge } from '@/components/admin/status-badge'
import { ContentTypeIcon } from '@/components/lab/content-icons'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'
import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, CONTENT_TYPE_META, CONTENT_TYPES, type ContentStatus, type ContentType } from '@/lib/labels'
import { buildQuery } from '@/lib/list-params'
import { cn, relativeTime } from '@/lib/utils'
import { requirePermission } from '@/server/auth/viewer'
import { listAdminContent } from '@/server/queries/admin'

export const metadata: Metadata = { title: 'Conteúdo' }

export default async function AdminContentPage({ searchParams }: PageProps<'/admin/content'>) {
  await requirePermission('content:write')
  const sp = await searchParams
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const type = (CONTENT_TYPES as readonly string[]).includes(str(sp.type) ?? '') ? (str(sp.type) as ContentType) : undefined
  const status = (CONTENT_STATUSES as readonly string[]).includes(str(sp.status) ?? '') ? (str(sp.status) as ContentStatus) : undefined
  const q = str(sp.q)?.trim().slice(0, 120) || undefined
  const page = Math.max(1, Math.min(Number(str(sp.page)) || 1, 1000))
  const data = await listAdminContent({ type, status, q, page })

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conteúdo</h1>
          <p className="mt-1 text-sm text-mute">{data.total} itens</p>
        </div>
        <Button asChild variant="primary">
          <Link href={`/admin/content/new?type=${type ?? 'PROMPT'}`}>
            <Plus /> Novo {type ? CONTENT_TYPE_META[type].label.toLowerCase() : 'conteúdo'}
          </Link>
        </Button>
      </header>

      <nav aria-label="Tipos" className="flex flex-wrap gap-2">
        <Link href={`/admin/content${buildQuery({ status, q })}`} className={chip(!type)}>
          Todos
        </Link>
        {CONTENT_TYPES.map((t) => (
          <Link key={t} href={`/admin/content${buildQuery({ type: t, status, q })}`} className={chip(type === t)}>
            {CONTENT_TYPE_META[t].plural}
          </Link>
        ))}
      </nav>

      <Form action="/admin/content" className="flex flex-col gap-2 sm:flex-row">
        {type && <input type="hidden" name="type" value={type} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título ou slug"
          maxLength={120}
          aria-label="Buscar conteúdo"
          className="h-10 flex-1 rounded-xl border border-input bg-ink-900 px-3.5 text-sm outline-none focus:border-gold-300/60"
        />
        <NativeSelect name="status" defaultValue={status ?? ''} className="sm:w-48" aria-label="Status">
          <option value="">Todos os status</option>
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONTENT_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit">Filtrar</Button>
      </Form>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-ink-900 text-left text-xs text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium" title="Visualizações · usos · favoritos">
                Uso
              </th>
              <th className="px-4 py-3 font-medium">Atualizado</th>
              <th className="px-4 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-border transition-colors hover:bg-bone/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/admin/content/${r.id}`} className="group flex items-center gap-2.5">
                    <ContentTypeIcon type={r.type} className="size-4 shrink-0 text-gold-300" />
                    <span className="font-medium group-hover:text-gold-100">{r.title}</span>
                    {r.featured && <Star className="size-3.5 fill-gold-300 text-gold-300" aria-label="Destaque" />}
                  </Link>
                  <span className="ml-6.5 block font-mono text-[11px] text-mute-600">{r.slug}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-mute">{r.categoryName ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-mute">
                  {r.viewCount} · {r.useCount} · {r.favoriteCount}
                </td>
                <td className="px-4 py-3 text-xs text-mute">{relativeTime(r.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <ContentRowActions id={r.id} type={r.type} slug={r.slug} status={r.status} featured={r.featured} title={r.title} />
                </td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-mute">
                  Nenhum conteúdo encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.pageCount > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`/admin/content${buildQuery({ type, status, q, page: page - 1 })}`} className="text-mute hover:text-bone">← Anterior</Link>}
          <span className="text-mute-600">
            Página {data.page} de {data.pageCount}
          </span>
          {page < data.pageCount && <Link href={`/admin/content${buildQuery({ type, status, q, page: page + 1 })}`} className="text-mute hover:text-bone">Próxima →</Link>}
        </nav>
      )}
    </div>
  )
}

function chip(active: boolean) {
  return cn(
    'rounded-full border px-3.5 py-1.5 text-[13px] transition-colors',
    active ? 'border-gold-300/40 bg-gold-300/10 text-gold-100' : 'border-border text-mute hover:text-bone',
  )
}
