import { ArrowLeft, ArrowUpRight, Eye, Lock } from 'lucide-react'
import Link from 'next/link'
import { CONTENT_STATUS_LABELS, CONTENT_TYPE_META, DIFFICULTY_LABELS, contentHref, type ContentType } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { RelatedItem } from '@/server/queries/content'
import type { DetailContext } from '@/features/detail-context'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ContentTypeIcon } from './content-icons'
import { FavoriteButton } from './favorite-button'
import { SaveToCollection } from './save-to-collection'

export function DetailHeader({
  ctx,
  type,
  badges,
  children,
}: {
  ctx: DetailContext
  type: ContentType
  badges?: React.ReactNode
  children?: React.ReactNode
}) {
  const { meta } = ctx
  return (
    <header className="grid gap-5">
      {meta.status !== 'PUBLISHED' && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          <Eye className="size-4" aria-hidden /> Pré-visualização de admin — status: {CONTENT_STATUS_LABELS[meta.status]}. Membros não veem este conteúdo.
        </div>
      )}
      <nav aria-label="Trilha" className="flex items-center gap-2 text-sm text-mute">
        <Link href={CONTENT_TYPE_META[type].path} className="inline-flex items-center gap-1.5 hover:text-bone">
          <ArrowLeft className="size-4" aria-hidden /> {CONTENT_TYPE_META[type].plural}
        </Link>
        {meta.category && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/lab/explore/${meta.category.slug}`} className="hover:text-bone">
              {meta.category.name}
            </Link>
          </>
        )}
      </nav>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl animate-fade-up">
          <p className="eyebrow flex items-center gap-2 !text-gold-200/80">
            <ContentTypeIcon type={type} className="size-3.5" /> {CONTENT_TYPE_META[type].label}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight md:text-[2.6rem]">{meta.title}</h1>
          {meta.summary && <p className="mt-3 text-[15px] leading-relaxed text-mute md:text-base">{meta.summary}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {meta.difficulty && <Badge>{DIFFICULTY_LABELS[meta.difficulty]}</Badge>}
            {badges}
            {meta.tags.map((t) => (
              <Link key={t.slug} href={`${CONTENT_TYPE_META[type].path}?tag=${t.slug}`}>
                <Badge className="hover:border-bone/20">#{t.name}</Badge>
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {children}
          {meta.status === 'PUBLISHED' && (
            <>
              <FavoriteButton contentId={meta.id} initial={ctx.favorited} title={meta.title} variant="button" />
              {ctx.canUseCollections && <SaveToCollection target={{ contentId: meta.id }} collections={ctx.collections} />}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function DetailSection({
  title,
  children,
  className,
  id,
}: {
  title: string
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section aria-labelledby={id} className={cn('rounded-2xl border border-border bg-ink-900/60 p-5 md:p-6', className)}>
      <h2 id={id} className="eyebrow mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function BulletList({ items, tone = 'default' }: { items: string[]; tone?: 'default' | 'warn' | 'gold' }) {
  if (!items.length) return <p className="text-sm text-mute-600">—</p>
  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-bone/85">
          <span
            className={cn(
              'mt-2 size-1.5 shrink-0 rounded-full',
              tone === 'warn' ? 'bg-danger' : tone === 'gold' ? 'bg-gold-300' : 'bg-bone/40',
            )}
            aria-hidden
          />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function KeyValueList({ items }: { items: { label: string; value: string }[] }) {
  if (!items.length) return <p className="text-sm text-mute-600">—</p>
  return (
    <dl className="grid gap-3">
      {items.map((kv) => (
        <div key={kv.label + kv.value} className="grid gap-0.5">
          <dt className="text-xs text-mute">{kv.label}</dt>
          <dd className="break-words font-mono text-[13px] text-bone/90">{kv.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function RelatedGroup({ title, items, empty }: { title: string; items: RelatedItem[]; empty?: string }) {
  if (!items.length && !empty) return null
  return (
    <div>
      <h3 className="mb-2.5 text-sm font-medium text-bone/90">{title}</h3>
      {items.length ? (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={`${item.id}-${item.kind}`}>
              <Link
                href={contentHref(item.type, item.slug)}
                className="group flex items-start gap-3 rounded-xl border border-border bg-ink-900/60 p-3 transition-colors hover:border-gold-300/30"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-bone/[0.04]">
                  <ContentTypeIcon type={item.type} className="size-4 text-gold-300" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{item.title}</span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-mute-600 transition-colors group-hover:text-gold-300" aria-hidden />
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-xs text-mute">{item.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-mute-600">{empty}</p>
      )}
    </div>
  )
}

export function ToolChips({ items, label }: { items: RelatedItem[]; label?: string }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-xs text-mute">{label}</span>}
      {items.map((t) => (
        <Link
          key={t.id}
          href={contentHref('TOOL', t.slug)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-ink-850 py-1 pl-1 pr-3 text-sm transition-colors hover:border-gold-300/40"
        >
          <span className="grid size-6 place-items-center rounded-full bg-ink-700 font-display text-[11px] text-gold-200">
            {t.title.charAt(0)}
          </span>
          {t.title}
        </Link>
      ))}
    </div>
  )
}

export function LockedNotice() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gold-300/20 bg-gold-300/[0.04] px-6 py-12 text-center">
      <Lock className="size-6 text-gold-300" aria-hidden />
      <p className="mt-4 font-medium">Conteúdo exclusivo de outro plano</p>
      <p className="mt-1.5 max-w-md text-sm text-mute">Este material faz parte de um plano que sua conta ainda não inclui.</p>
      <Button asChild variant="secondary" className="mt-5">
        <Link href="/lab">Voltar ao Lab</Link>
      </Button>
    </div>
  )
}
