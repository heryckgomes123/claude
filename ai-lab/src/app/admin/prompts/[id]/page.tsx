import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { PageHeader } from '@/components/lab/page-header'
import { ActionForm, DeleteButton } from '@/features/admin/action-form'
import { PromptFields } from '@/features/admin/prompt-fields'
import { deletePrompt, savePrompt } from '@/server/actions/admin'
import { adminCategories, adminPrompt } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Editar prompt · Painel' }

export default async function EditPromptPage({ params }: PageProps<'/admin/prompts/[id]'>) {
  await requireAdmin()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const [prompt, categories] = await Promise.all([adminPrompt(id), adminCategories()])
  if (!prompt) notFound()
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Editar prompt" description={prompt.title}>
        <DeleteButton action={deletePrompt.bind(null, prompt.id)} title={prompt.title} redirectTo="/admin/prompts" />
      </PageHeader>
      <ActionForm action={savePrompt} redirectTo="/admin/prompts">
        <PromptFields prompt={prompt} categories={categories} />
      </ActionForm>
    </div>
  )
}
