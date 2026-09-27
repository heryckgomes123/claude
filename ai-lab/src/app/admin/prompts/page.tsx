import { ImageIcon, Plus, Upload } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/features/admin/action-form'
import { deletePrompt } from '@/server/actions/admin'
import { adminPrompts } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Prompts · Painel' }

export default async function AdminPromptsPage() {
  await requireAdmin()
  const prompts = await adminPrompts()
  return (
    <div className="grid gap-6">
      <PageHeader title="Prompts" description={`${prompts.length} cadastrados. Os alunos veem apenas os publicados.`}>
        <Button asChild variant="primary">
          <Link href="/admin/prompts/novo">
            <Plus /> Novo prompt
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin/prompts/importar">
            <Upload /> Importar planilha
          </Link>
        </Button>
      </PageHeader>
      {prompts.length === 0 ? (
        <EmptyState title="Nenhum prompt ainda" description="Cadastre um por um ou importe vários de uma planilha." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-ink-900 text-left text-xs text-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Prompt</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Cópias</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prompts.map((p) => (
                <tr key={p.id} className="hover:bg-bone/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/prompts/${p.id}`} className="font-medium hover:text-gold-200">
                      {p.title}
                    </Link>
                    {p.imageId && <ImageIcon className="ml-2 inline size-3.5 text-mute" aria-label="com imagem" />}
                  </td>
                  <td className="px-4 py-3 text-mute">{p.category}</td>
                  <td className="px-4 py-3 font-mono text-xs text-mute">{p.copyCount}</td>
                  <td className="px-4 py-3">
                    {p.published ? <Badge variant="success">Publicado</Badge> : <Badge>Rascunho</Badge>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/prompts/${p.id}`}>Editar</Link>
                    </Button>
                    {p.published && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/lab/prompts/${p.slug}`}>Ver</Link>
                      </Button>
                    )}
                    <DeleteButton compact action={deletePrompt.bind(null, p.id)} title={p.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
