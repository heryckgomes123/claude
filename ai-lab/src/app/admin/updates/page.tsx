import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { DeleteUpdateButton, UpdateDialog } from '@/features/admin/admin-forms'
import { relativeTime } from '@/lib/utils'
import { requirePermission } from '@/server/auth/viewer'
import { getEditorOptions, listUpdatesForAdmin } from '@/server/queries/admin'

export const metadata: Metadata = { title: 'Novidades' }

const KIND_LABELS = { NEW_CONTENT: 'Novo conteúdo', FEATURE: 'Novo recurso', ANNOUNCEMENT: 'Comunicado' } as const

export default async function UpdatesPage() {
  await requirePermission('updates:write')
  const [updates, options] = await Promise.all([listUpdatesForAdmin(), getEditorOptions()])
  const contents = options.items.filter((i) => i.status === 'PUBLISHED').map((i) => ({ id: i.id, title: i.title, type: i.type }))
  return (
    <div className="grid gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novidades do Lab</h1>
          <p className="mt-1 text-sm text-mute">Comunicados exibidos na Home dos membros.</p>
        </div>
        <UpdateDialog contents={contents} />
      </header>
      <ul className="grid gap-3">
        {updates.map((u) => (
          <li key={u.id} className="flex items-start gap-4 rounded-2xl border border-border bg-ink-900/60 p-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{u.title}</span>
                <Badge variant={u.state === 'PUBLISHED' ? 'success' : 'default'}>{u.state === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}</Badge>
                <Badge variant="mono">{KIND_LABELS[u.kind]}</Badge>
              </div>
              {u.body && <p className="mt-1 text-sm text-mute">{u.body}</p>}
              <p className="mt-1 text-xs text-mute-600">Atualizada {relativeTime(u.updatedAt)}</p>
            </div>
            <UpdateDialog update={u} contents={contents} />
            <DeleteUpdateButton id={u.id} title={u.title} />
          </li>
        ))}
        {updates.length === 0 && <li className="text-sm text-mute">Nenhuma novidade.</li>}
      </ul>
    </div>
  )
}
