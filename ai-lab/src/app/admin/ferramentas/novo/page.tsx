import type { Metadata } from 'next'
import { PageHeader } from '@/components/lab/page-header'
import { ActionForm } from '@/features/admin/action-form'
import { ToolFields } from '@/features/admin/tool-fields'
import { saveTool } from '@/server/actions/admin'
import { adminToolCategories } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Nova ferramenta · Painel' }

export default async function NewToolPage() {
  await requireAdmin()
  const categories = await adminToolCategories()
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Nova ferramenta" />
      <ActionForm action={saveTool} redirectTo="/admin/ferramentas" submitLabel="Criar ferramenta">
        <ToolFields categories={categories} />
      </ActionForm>
    </div>
  )
}
