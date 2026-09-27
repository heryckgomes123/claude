import { Plus, Video } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/features/admin/action-form'
import { deleteLesson } from '@/server/actions/admin'
import { adminLessons } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'
import { groupByModule } from '@/server/queries'

export const metadata: Metadata = { title: 'Aulas · Painel' }

export default async function AdminLessonsPage() {
  await requireAdmin()
  const lessons = await adminLessons()
  return (
    <div className="grid gap-6">
      <PageHeader title="Aulas" description="Organize por módulos. Use o campo “Ordem” para definir a sequência.">
        <Button asChild variant="primary">
          <Link href="/admin/aulas/novo">
            <Plus /> Nova aula
          </Link>
        </Button>
      </PageHeader>
      {lessons.length === 0 ? (
        <EmptyState title="Nenhuma aula ainda" description="Crie a primeira aula com o link do vídeo e o texto de apoio." />
      ) : (
        groupByModule(lessons).map((group) => (
          <section key={group.module} className="grid gap-2">
            <h2 className="text-sm font-medium text-mute">{group.module}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {group.items.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-bone/[0.02]">
                  <span className="w-8 font-mono text-xs text-mute-600">#{l.position}</span>
                  <Link href={`/admin/aulas/${l.id}`} className="min-w-0 flex-1 font-medium hover:text-gold-200">
                    {l.title}
                  </Link>
                  {l.videoUrl && <Video className="size-4 text-mute" aria-label="com vídeo" />}
                  <span className="text-xs text-mute">{l.completions} concluíram</span>
                  {l.published ? <Badge variant="success">Publicada</Badge> : <Badge>Rascunho</Badge>}
                  <span className="whitespace-nowrap">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/aulas/${l.id}`}>Editar</Link>
                    </Button>
                    <DeleteButton compact action={deleteLesson.bind(null, l.id)} title={l.title} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
