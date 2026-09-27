import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { PageHeader } from '@/components/lab/page-header'
import { ActionForm, DeleteButton } from '@/features/admin/action-form'
import { ToolFields } from '@/features/admin/tool-fields'
import { deleteTool, saveTool } from '@/server/actions/admin'
import { adminTool, adminToolCategories } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Editar ferramenta · Painel' }

export default async function EditToolPage({ params }: PageProps<'/admin/ferramentas/[id]'>) {
  await requireAdmin()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const [tool, categories] = await Promise.all([adminTool(id), adminToolCategories()])
  if (!tool) notFound()
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Editar ferramenta" description={tool.name}>
        <DeleteButton action={deleteTool.bind(null, tool.id)} title={tool.name} redirectTo="/admin/ferramentas" />
      </PageHeader>
      <ActionForm action={saveTool} redirectTo="/admin/ferramentas">
        <ToolFields tool={tool} categories={categories} />
      </ActionForm>
    </div>
  )
}
