import type { Metadata } from 'next'
import { PageHeader } from '@/components/lab/page-header'
import { ActionForm } from '@/features/admin/action-form'
import { LessonFields } from '@/features/admin/lesson-fields'
import { saveLesson } from '@/server/actions/admin'
import { adminModules, adminPromptOptions } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Nova aula · Painel' }

export default async function NewLessonPage() {
  await requireAdmin()
  const [modules, prompts] = await Promise.all([adminModules(), adminPromptOptions()])
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Nova aula" />
      <ActionForm action={saveLesson} redirectTo="/admin/aulas" submitLabel="Criar aula">
        <LessonFields modules={modules} prompts={prompts} />
      </ActionForm>
    </div>
  )
}
