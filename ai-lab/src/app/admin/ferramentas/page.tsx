import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/features/admin/action-form'
import { deleteTool } from '@/server/actions/admin'
import { adminTools } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Ferramentas · Painel' }

export default async function AdminToolsPage() {
  await requireAdmin()
  const tools = await adminTools()
  return (
    <div className="grid gap-6">
      <PageHeader title="Ferramentas" description="As IAs e apps que você indica para os alunos.">
        <Button asChild variant="primary">
          <Link href="/admin/ferramentas/novo">
            <Plus /> Nova ferramenta
          </Link>
        </Button>
      </PageHeader>
      {tools.length === 0 ? (
        <EmptyState title="Nenhuma ferramenta ainda" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {tools.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-bone/[0.02]">
              <Link href={`/admin/ferramentas/${t.id}`} className="min-w-0 flex-1 font-medium hover:text-gold-200">
                {t.name}
              </Link>
              <span className="text-xs text-mute">{t.category}</span>
              {t.published ? <Badge variant="success">Publicada</Badge> : <Badge>Rascunho</Badge>}
              <span className="whitespace-nowrap">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/ferramentas/${t.id}`}>Editar</Link>
                </Button>
                <DeleteButton compact action={deleteTool.bind(null, t.id)} title={t.name} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
