import type { Metadata } from 'next'
import Form from 'next/form'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MemberActions } from '@/features/admin/admin-forms'
import { buildQuery } from '@/lib/list-params'
import { formatDate } from '@/lib/utils'
import { ROLE_LABELS, isRole } from '@/server/access/roles'
import { requirePermission } from '@/server/auth/viewer'
import { listMembers, listPlans } from '@/server/queries/admin'

export const metadata: Metadata = { title: 'Membros' }

export default async function MembersPage({ searchParams }: PageProps<'/admin/members'>) {
  const viewer = await requirePermission('members:manage')
  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 120) : undefined
  const page = Math.max(1, Math.min(Number(sp.page) || 1, 1000))
  const [data, plans] = await Promise.all([listMembers({ q, page }), listPlans()])

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
        <p className="mt-1 text-sm text-mute">
          {data.total} contas. O acesso ao Lab vem de uma membership ativa (código resgatado, concessão manual ou integração futura).
        </p>
      </header>
      <Form action="/admin/members" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail"
          maxLength={120}
          aria-label="Buscar membros"
          className="h-10 flex-1 rounded-xl border border-input bg-ink-900 px-3.5 text-sm outline-none focus:border-gold-300/60"
        />
        <Button type="submit">Buscar</Button>
      </Form>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-ink-900 text-left text-xs text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">Pessoa</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Acesso</th>
              <th className="px-4 py-3 font-medium">Desde</th>
              <th className="px-4 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((m) => (
              <tr key={m.id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <span className="block font-medium">{m.name}</span>
                  <span className="text-xs text-mute">{m.email}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.role === 'ADMIN' ? 'electric' : 'default'}>{isRole(m.role) ? ROLE_LABELS[m.role] : m.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {m.memberships.length === 0 && <span className="text-xs text-mute-600">Sem acesso</span>}
                    {m.memberships.map((ms) => (
                      <Badge key={ms.id} variant={ms.active ? 'success' : 'default'} title={ms.source}>
                        {ms.planName} · {ms.active ? (ms.endsAt ? `até ${formatDate(ms.endsAt)}` : 'ativo') : ms.status.toLowerCase()}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-mute">{formatDate(m.createdAt)}</td>
                <td className="px-4 py-3">
                  <MemberActions
                    userId={m.id}
                    email={m.email}
                    role={m.role}
                    isSelf={m.id === viewer.id}
                    plans={plans.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))}
                    memberships={m.memberships.map((ms) => ({ id: ms.id, planName: ms.planName, active: Boolean(ms.active) }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.pageCount > 1 && (
        <nav aria-label="Paginação" className="flex justify-center gap-3 text-sm">
          {page > 1 && <Link href={`/admin/members${buildQuery({ q, page: page - 1 })}`}>← Anterior</Link>}
          <span className="text-mute-600">
            Página {data.page} de {data.pageCount}
          </span>
          {page < data.pageCount && <Link href={`/admin/members${buildQuery({ q, page: page + 1 })}`}>Próxima →</Link>}
        </nav>
      )}
    </div>
  )
}
