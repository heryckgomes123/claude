import { Search } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GrantEmailsForm, GrantStatusButton } from '@/features/admin/grant-forms'
import { formatDate } from '@/lib/utils'
import { listGrants } from '@/server/access/grants'
import { progressByEmail } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Alunos · Painel' }

const SOURCE_LABELS: Record<string, string> = { MANUAL: 'Manual', HOTMART: 'Hotmart', KIWIFY: 'Kiwify' }

export default async function AdminStudentsPage({ searchParams }: PageProps<'/admin/alunos'>) {
  await requireAdmin()
  const { q } = await searchParams
  const search = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 100) ?? ''
  const [grants, progress] = await Promise.all([listGrants({ q: search }), progressByEmail()])
  const active = grants.filter((g) => g.status === 'ACTIVE').length

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Alunos"
        description="Quem compra pela Hotmart ou Kiwify aparece aqui automaticamente. Você também pode liberar e-mails à mão."
      />
      <div className="rounded-2xl border border-border bg-ink-900/70 p-5">
        <GrantEmailsForm />
      </div>

      <form role="search" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden />
        <input
          name="q"
          defaultValue={search}
          aria-label="Buscar aluno por e-mail ou nome"
          placeholder="Buscar por e-mail ou nome…"
          className="h-10 w-full rounded-xl border border-input bg-ink-900/80 pl-10 pr-24 text-sm text-bone placeholder:text-bone/35 focus-visible:border-gold-300/60 focus-visible:outline-none"
        />
        <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2">
          Buscar
        </Button>
      </form>

      {grants.length === 0 ? (
        <EmptyState title={search ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'} />
      ) : (
        <div className="grid gap-2">
          <p className="text-sm text-mute">
            {active} com acesso ativo{search && ` para “${search}”`}
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-ink-900 text-left text-xs text-mute">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Conta</th>
                  <th className="px-4 py-3 font-medium">Aulas</th>
                  <th className="px-4 py-3 font-medium">Acesso</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grants.map((g) => (
                  <tr key={g.id} className="hover:bg-bone/[0.02]">
                    <td className="px-4 py-3">
                      <span className="block font-medium">{g.userName ?? g.name ?? '—'}</span>
                      <span className="block text-xs text-mute">{g.email}</span>
                    </td>
                    <td className="px-4 py-3 text-mute">
                      <span className="block">{SOURCE_LABELS[g.source] ?? g.source}</span>
                      <span className="block text-xs text-mute-600">{formatDate(g.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {g.userId ? <Badge variant="electric">Criada</Badge> : <span className="text-xs text-mute-600">Ainda não criou</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-mute">{progress.get(g.email) ?? 0}</td>
                    <td className="px-4 py-3">
                      {g.status === 'ACTIVE' ? <Badge variant="success">Liberado</Badge> : <Badge variant="danger">Bloqueado</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <GrantStatusButton id={g.id} status={g.status} email={g.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
