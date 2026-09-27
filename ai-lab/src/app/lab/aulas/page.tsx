import { BookOpen, Check } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { ProgressBar } from '@/components/lab/progress-bar'
import { cn, formatMinutes } from '@/lib/utils'
import { requireMember } from '@/server/auth/viewer'
import { groupByModule, listLessons } from '@/server/queries'

export const metadata: Metadata = { title: 'Aulas' }

export default async function LessonsPage() {
  const viewer = await requireMember()
  const lessons = await listLessons(viewer.id)
  const done = lessons.filter((l) => l.done).length
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Estudos"
        title="Aulas"
        description="Aprenda a técnica por trás de cada prompt. Marque as aulas concluídas para acompanhar seu progresso."
      />
      {lessons.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-5" />} title="Nenhuma aula publicada ainda" description="As aulas aparecem aqui assim que forem publicadas." />
      ) : (
        <>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-ink-900/70 p-5">
            <div className="flex-1">
              <ProgressBar value={done} total={lessons.length} label="Progresso nas aulas" />
            </div>
            <span className="font-mono text-sm text-bone/85">
              {pct}% · {done}/{lessons.length}
            </span>
          </div>
          {groupByModule(lessons).map((group) => (
            <section key={group.module} aria-labelledby={`m-${group.module}`}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2 id={`m-${group.module}`} className="text-lg font-semibold tracking-tight">
                  {group.module}
                </h2>
                <span className="text-xs text-mute">
                  {group.items.filter((l) => l.done).length}/{group.items.length} concluídas
                </span>
              </div>
              <ol className="grid gap-2">
                {group.items.map((l, i) => (
                  <li key={l.id}>
                    <Link href={`/lab/aulas/${l.slug}`} className="lab-card flex items-center gap-4 rounded-2xl p-4">
                      <span
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-full border font-mono text-xs',
                          l.done ? 'border-success/40 bg-success/10 text-success' : 'border-border text-mute',
                        )}
                      >
                        {l.done ? <Check className="size-4" aria-label="Concluída" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{l.title}</span>
                        {l.summary && <span className="mt-0.5 line-clamp-2 block text-sm text-mute">{l.summary}</span>}
                      </span>
                      {formatMinutes(l.durationMin) && (
                        <span className="shrink-0 whitespace-nowrap text-xs text-mute-600">{formatMinutes(l.durationMin)}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
