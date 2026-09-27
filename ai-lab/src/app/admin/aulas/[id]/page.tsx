import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { PageHeader } from '@/components/lab/page-header'
import { ActionForm, DeleteButton } from '@/features/admin/action-form'
import { LessonFields } from '@/features/admin/lesson-fields'
import { deleteLesson, saveLesson } from '@/server/actions/admin'
import { adminLesson, adminModules, adminPromptOptions } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Editar aula · Painel' }

export default async function EditLessonPage({ params }: PageProps<'/admin/aulas/[id]'>) {
  await requireAdmin()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const [lesson, modules, prompts] = await Promise.all([adminLesson(id), adminModules(), adminPromptOptions()])
  if (!lesson) notFound()
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Editar aula" description={lesson.title}>
        <DeleteButton action={deleteLesson.bind(null, lesson.id)} title={lesson.title} redirectTo="/admin/aulas" />
      </PageHeader>
      <ActionForm action={saveLesson} redirectTo="/admin/aulas">
        <LessonFields lesson={lesson} modules={modules} prompts={prompts} />
      </ActionForm>
    </div>
  )
}
