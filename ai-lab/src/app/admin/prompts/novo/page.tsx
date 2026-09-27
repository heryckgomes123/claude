import type { Metadata } from 'next'
import { PageHeader } from '@/components/lab/page-header'
import { ActionForm } from '@/features/admin/action-form'
import { PromptFields } from '@/features/admin/prompt-fields'
import { savePrompt } from '@/server/actions/admin'
import { adminCategories } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Novo prompt · Painel' }

export default async function NewPromptPage() {
  await requireAdmin()
  const categories = await adminCategories()
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Novo prompt" />
      <ActionForm action={savePrompt} redirectTo="/admin/prompts" submitLabel="Criar prompt">
        <PromptFields categories={categories} />
      </ActionForm>
    </div>
  )
}
