import Link from 'next/link'
import { fillVariables } from '@/lib/prompt-variables'
import type { PromptCard as PromptCardData } from '@/server/queries'
import { CopyButton } from './copy-button'
import { PromptCover } from './cover'
import { FavoriteButton } from './favorite-button'

export function PromptCard({ prompt }: { prompt: PromptCardData }) {
  const href = `/lab/prompts/${prompt.slug}`
  return (
    <article className="lab-card group relative flex flex-col overflow-hidden rounded-2xl">
      <Link href={href} tabIndex={-1} aria-hidden>
        <PromptCover seed={prompt.slug} imageId={prompt.imageId} className="aspect-[16/10]" />
      </Link>
      <FavoriteButton promptId={prompt.id} initial={prompt.isFavorite} title={prompt.title} className="absolute right-3 top-3 z-10" />
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow !text-[10px]">{prompt.category}</p>
        <h3 className="mt-1.5 font-medium leading-snug">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {prompt.title}
          </Link>
        </h3>
        {prompt.description && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-mute">{prompt.description}</p>}
        <div className="relative z-10 mt-auto flex items-center gap-2 pt-4">
          <CopyButton text={fillVariables(prompt.body, {})} promptId={prompt.id} size="sm" />
          {prompt.tools && <span className="truncate text-xs text-mute-600">{prompt.tools}</span>}
        </div>
      </div>
    </article>
  )
}

export function PromptGrid({ prompts }: { prompts: PromptCardData[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {prompts.map((p) => (
        <PromptCard key={p.id} prompt={p} />
      ))}
    </div>
  )
}
