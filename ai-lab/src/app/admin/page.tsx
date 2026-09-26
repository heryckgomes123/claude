import { ArrowRight, Plus, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/admin/status-badge'
import { ContentTypeIcon } from '@/components/lab/content-icons'
import { SectionHeader } from '@/components/lab/page-header'
import { Button } from '@/components/ui/button'
import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, CONTENT_TYPE_META, CONTENT_TYPES, VERIFICATION_LABELS } from '@/lib/labels'
import { formatDate, relativeTime } from '@/lib/utils'
import { requirePermission } from '@/server/auth/viewer'
import { getAdminOverview } from '@/server/queries/admin'

export default async function AdminHome() {
  await requirePermission('admin:access')
  const data = await getAdminOverview()
  const cell = (type: string, status: string) => data.byTypeStatus.find((r) => r.type === type && r.status === status)?.count ?? 0

  return (
    <div className="grid gap-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow !text-electric">INTELRA · laboratório de conteúdo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Command Center</h1>
          <p className="mt-2 text-mute">
            {data.members.users} contas · {data.members.active} com acesso ativo ao Lab
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((t) => (
            <Button key={t} asChild size="sm" variant="secondary">
              <Link href={`/admin/content/new?type=${t}`}>
                <Plus /> {CONTENT_TYPE_META[t].label}
              </Link>
            </Button>
          ))}
        </div>
      </header>

      <section aria-labelledby="matrix" className="overflow-x-auto rounded-2xl border border-border">
        <h2 id="matrix" className="sr-only">
          Conteúdo por tipo e status
        </h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ink-900 text-left text-xs text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">Tipo</th>
              {CONTENT_STATUSES.map((s) => (
                <th key={s} className="px-4 py-3 font-medium">
                  {CONTENT_STATUS_LABELS[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONTENT_TYPES.map((t) => (
              <tr key={t} className="border-t border-border">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  <span className="flex items-center gap-2">
                    <ContentTypeIcon type={t} className="size-4 text-gold-300" /> {CONTENT_TYPE_META[t].plural}
                  </span>
                </th>
                {CONTENT_STATUSES.map((s) => (
                  <td key={s} className="px-4 py-3">
                    <Link href={`/admin/content?type=${t}&status=${s}`} className="font-mono text-bone/80 hover:text-gold-200">
                      {cell(t, s)}
                    </Link>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="review-title" className="rounded-2xl border border-border bg-ink-900/60 p-5">
          <SectionHeader id="review-title" title="Aguardando revisão" />
          {data.review.length ? (
            <ul className="grid gap-2">
              {data.review.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/content/${r.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bone/[0.04]">
                    <ContentTypeIcon type={r.type} className="size-4 text-mute" />
                    <span className="flex-1 truncate">{r.title}</span>
                    <span className="text-xs text-mute-600">{relativeTime(r.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute-600">Nada em revisão.</p>
          )}
        </section>

        <section aria-labelledby="verify-title" className="rounded-2xl border border-border bg-ink-900/60 p-5">
          <SectionHeader id="verify-title" title="Ferramentas para verificar" description="Pendentes, desatualizadas ou com +90 dias." />
          {data.toolsToVerify.length ? (
            <ul className="grid gap-2">
              {data.toolsToVerify.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/content/${t.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bone/[0.04]">
                    <ShieldAlert className="size-4 text-warning" aria-hidden />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-mute-600">{t.verifiedAt ? formatDate(t.verifiedAt) : VERIFICATION_LABELS[t.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute-600">Todas verificadas.</p>
          )}
        </section>

        <section aria-labelledby="recent-title" className="rounded-2xl border border-border bg-ink-900/60 p-5">
          <SectionHeader
            id="recent-title"
            title="Editados recentemente"
            action={
              <Link href="/admin/content" className="inline-flex items-center gap-1 text-sm text-mute hover:text-gold-200">
                Todos <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="grid gap-2">
            {data.recent.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/content/${r.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bone/[0.04]">
                  <ContentTypeIcon type={r.type} className="size-4 text-mute" />
                  <span className="flex-1 truncate">{r.title}</span>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
