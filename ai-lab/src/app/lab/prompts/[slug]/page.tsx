import { ArrowLeft, BookOpen, Lightbulb } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PromptCover } from '@/components/lab/cover'
import { FavoriteButton } from '@/components/lab/favorite-button'
import { PromptWorkbench } from '@/features/prompt-workbench'
import { requireMember } from '@/server/auth/viewer'
import { getPrompt } from '@/server/queries'

export async function generateMetadata({ params }: PageProps<'/lab/prompts/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ') }
}

export default async function PromptPage({ params }: PageProps<'/lab/prompts/[slug]'>) {
  const viewer = await requireMember()
  const { slug } = await params
  const prompt = await getPrompt(slug, viewer.id)
  if (!prompt) notFound()

  return (
    <article className="grid max-w-4xl gap-6">
      <Link href="/lab/prompts" className="inline-flex items-center gap-1.5 justify-self-start text-sm text-mute hover:text-bone">
        <ArrowLeft className="size-4" aria-hidden /> Prompts
      </Link>

      <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl animate-fade-up">
          <Link
            href={`/lab/prompts?categoria=${encodeURIComponent(prompt.category)}`}
            className="inline-block rounded-full border border-border px-3 py-1 text-xs text-bone/80 hover:border-gold-300/40"
          >
            {prompt.category}
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{prompt.title}</h1>
          {prompt.description && <p className="mt-3 text-[15px] leading-relaxed text-mute">{prompt.description}</p>}
          {prompt.tools && (
            <p className="mt-3 text-sm">
              <span className="text-mute">Use em:</span> {prompt.tools}
            </p>
          )}
        </div>
        <FavoriteButton promptId={prompt.id} initial={prompt.isFavorite} title={prompt.title} variant="button" className="shrink-0" />
      </header>

      {prompt.imageId && (
        <figure className="max-w-xl overflow-hidden rounded-2xl border border-border">
          <PromptCover seed={prompt.slug} imageId={prompt.imageId} className="aspect-[4/3]" priority />
          <figcaption className="border-t border-border bg-ink-900 px-4 py-2 text-xs text-mute">Exemplo de resultado</figcaption>
        </figure>
      )}

      <PromptWorkbench promptId={prompt.id} body={prompt.body} negative={prompt.negative} />

      {prompt.tips.length > 0 && (
        <section className="rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="dicas">
          <h2 id="dicas" className="eyebrow flex items-center gap-2">
            <Lightbulb className="size-3.5 text-gold-300" aria-hidden /> Dicas de uso
          </h2>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-bone/85">
            {prompt.tips.map((tip) => (
              <li key={tip} className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-300" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      {prompt.lessons.length > 0 && (
        <section className="rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="aulas-rel">
          <h2 id="aulas-rel" className="eyebrow">
            Aprenda nas aulas
          </h2>
          <ul className="mt-3 grid gap-2">
            {prompt.lessons.map((l) => (
              <li key={l.slug}>
                <Link href={`/lab/aulas/${l.slug}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-bone/[0.04]">
                  <span className="grid size-9 place-items-center rounded-lg bg-gold-300/10 text-gold-300">
                    <BookOpen className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{l.title}</span>
                    <span className="block text-xs text-mute">{l.module}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
