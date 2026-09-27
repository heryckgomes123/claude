import { ArrowLeft, ArrowRight, ExternalLink, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SectionHeader } from '@/components/lab/page-header'
import { PromptGrid } from '@/components/lab/prompt-card'
import { Button } from '@/components/ui/button'
import { LessonDoneButton } from '@/features/lesson-done-button'
import { parseLessonContent, toVideoEmbed } from '@/lib/lesson'
import { formatMinutes, safeExternalUrl } from '@/lib/utils'
import { requireMember } from '@/server/auth/viewer'
import { getLesson } from '@/server/queries'

export async function generateMetadata({ params }: PageProps<'/lab/aulas/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ') }
}

export default async function LessonPage({ params }: PageProps<'/lab/aulas/[slug]'>) {
  const viewer = await requireMember()
  const { slug } = await params
  const lesson = await getLesson(slug, viewer.id)
  if (!lesson) notFound()

  const video = toVideoEmbed(lesson.videoUrl)
  const videoLink = !video ? safeExternalUrl(lesson.videoUrl) : null
  const material = safeExternalUrl(lesson.materialUrl)
  const blocks = parseLessonContent(lesson.content ?? '')

  return (
    <article className="grid max-w-3xl gap-6">
      <Link href="/lab/aulas" className="inline-flex items-center gap-1.5 justify-self-start text-sm text-mute hover:text-bone">
        <ArrowLeft className="size-4" aria-hidden /> Aulas
      </Link>

      <header className="animate-fade-up">
        <p className="eyebrow">
          {lesson.module} · Aula {lesson.position} de {lesson.total}
          {formatMinutes(lesson.durationMin) && ` · ${formatMinutes(lesson.durationMin)}`}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-3 text-[15px] leading-relaxed text-mute">{lesson.summary}</p>}
      </header>

      {video?.kind === 'iframe' && (
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-ink-900">
          <iframe
            src={video.src}
            title={`Vídeo: ${lesson.title}`}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      {video?.kind === 'file' && (
        <video src={video.src} controls preload="metadata" className="w-full rounded-2xl border border-border bg-ink-900">
          <track kind="captions" />
        </video>
      )}

      {(videoLink || material) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {videoLink && <ResourceLink href={videoLink} label="Assistir à aula" />}
          {material && <ResourceLink href={material} label="Material da aula" icon={<FileText className="size-4" aria-hidden />} />}
        </div>
      )}

      {blocks.length > 0 && (
        <div className="grid gap-4 text-[15px] leading-relaxed text-bone/85">
          {blocks.map((b, i) =>
            b.kind === 'heading' ? (
              <h2 key={i} className="mt-3 text-lg font-semibold tracking-tight text-bone">
                {b.text}
              </h2>
            ) : b.kind === 'list' ? (
              <ul key={i} className="grid gap-1.5">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold-300" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p key={i}>{b.text}</p>
            ),
          )}
        </div>
      )}

      {lesson.prompts.length > 0 && (
        <section aria-labelledby="prompts-aula" className="mt-2">
          <SectionHeader id="prompts-aula" title="Prompts desta aula" />
          <PromptGrid prompts={lesson.prompts} />
        </section>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-ink-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <LessonDoneButton lessonId={lesson.id} done={lesson.done} />
        {lesson.next && (
          <Button asChild variant="ghost" className="min-w-0 justify-start sm:justify-end">
            <Link href={`/lab/aulas/${lesson.next.slug}`}>
              <span className="truncate">Próxima: {lesson.next.title}</span> <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </article>
  )
}

function ResourceLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="lab-card flex items-center gap-3 rounded-2xl p-4"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-gold-300/10 text-gold-300">
        {icon ?? <ExternalLink className="size-4" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-mute">{new URL(href).hostname}</span>
      </span>
    </a>
  )
}
