import type { Metadata } from 'next'
import { PageHeader } from '@/components/lab/page-header'
import { ImportForm } from '@/features/admin/import-form'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Importar prompts · Painel' }

export default async function ImportPromptsPage() {
  await requireAdmin()
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Importar prompts" description="Cadastre vários prompts de uma vez a partir de uma planilha." />
      <ImportForm />
    </div>
  )
}
