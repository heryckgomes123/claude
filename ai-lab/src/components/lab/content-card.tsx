import { Clock, Lock, ShieldAlert, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import {
  CONTENT_TYPE_META,
  DIFFICULTY_LABELS,
  MEDIA_LABELS,
  PRICING_LABELS,
  VERIFICATION_LABELS,
  contentHref,
} from '@/lib/labels'
import { cn, formatMinutes } from '@/lib/utils'
import type { ContentCard as Card } from '@/server/queries/content'
import { Badge } from '../ui/badge'
import { ContentTypeIcon } from './content-icons'
import { Cover } from './cover'
import { FavoriteButton } from './favorite-button'

function Meta({ card }: { card: Card }) {
  const minutes = formatMinutes(card.estimatedMinutes)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {card.mediaType && <Badge variant="mono">{MEDIA_LABELS[card.mediaType]}</Badge>}
      {card.difficulty && <Badge>{DIFFICULTY_LABELS[card.difficulty]}</Badge>}
      {minutes && (
        <Badge>
          <Clock /> {minutes}
        </Badge>
      )}
      {card.pricingStatus && <Badge>{PRICING_LABELS[card.pricingStatus]}</Badge>}
      {card.requiredEntitlement && (
        <Badge variant="gold">
          <Lock /> Premium
        </Badge>
      )}
    </div>
  )
}

function Tools({ card }: { card: Card }) {
  if (!card.tools.length) return null
  return (
    <p className="truncate text-xs text-mute-600">
      <span className="text-mute">Ferramentas:</span> {card.tools.slice(0, 3).map((t) => t.title).join(' · ')}
    </p>
  )
}

/** Card universal de conteúdo; o layout se adapta ao tipo. */
export function ContentCard({ card, showType = false, className }: { card: Card; showType?: boolean; className?: string }) {
  const href = contentHref(card.type, card.slug)

  if (card.type === 'TOOL') {
    const verified = card.verificationStatus === 'VERIFIED'
    return (
      <article className={cn('lab-card group relative flex flex-col gap-4 rounded-2xl p-5', className)}>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-12 place-items-center rounded-xl border border-border bg-gradient-to-br from-ink-700 to-ink-850 font-display text-xl text-gold-200">
            {card.title.charAt(0)}
          </span>
          <FavoriteButton contentId={card.id} initial={card.isFavorite} title={card.title} className="relative z-10" />
        </div>
        <div>
          {showType && <TypeLabel card={card} />}
          <h3 className="font-medium">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl">
              {card.title}
            </Link>
          </h3>
          {card.category && <p className="mt-0.5 text-xs text-mute-600">{card.category.name}</p>}
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-mute">{card.summary}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <Meta card={card} />
          <Badge variant={verified ? 'success' : card.verificationStatus === 'OUTDATED' ? 'danger' : 'warning'}>
            {verified ? <ShieldCheck /> : <ShieldAlert />}
            {VERIFICATION_LABELS[card.verificationStatus ?? 'NEEDS_REVIEW']}
          </Badge>
        </div>
      </article>
    )
  }

  if (card.type === 'WORKFLOW' || card.type === 'TUTORIAL') {
    return (
      <article className={cn('lab-card group relative flex flex-col gap-4 rounded-2xl p-5', className)}>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-border bg-bone/[0.03]">
            <ContentTypeIcon type={card.type} className="size-[18px] text-gold-300" />
          </span>
          <FavoriteButton contentId={card.id} initial={card.isFavorite} title={card.title} className="relative z-10" />
        </div>
        <div>
          {showType ? <TypeLabel card={card} /> : card.category && <p className="eyebrow !text-[10px]">{card.category.name}</p>}
          <h3 className="mt-1 font-medium leading-snug">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl">
              {card.title}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-mute">{card.summary}</p>
        </div>
        <div className="mt-auto grid gap-3">
          <Tools card={card} />
          <Meta card={card} />
        </div>
      </article>
    )
  }

  // PROMPT e REFERENCE: card visual
  const aspect = card.type === 'REFERENCE' ? ratioToAspect(card.aspectRatio) : '16 / 10'
  return (
    <article className={cn('lab-card group relative flex flex-col overflow-hidden rounded-2xl', className)}>
      <Cover
        seed={card.slug}
        type={card.type}
        imageUrl={card.coverImageUrl}
        palette={card.palette}
        style={{ aspectRatio: aspect }}
        className="w-full transition-transform duration-500 ease-(--ease-premium) group-hover:scale-[1.02]"
      />
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton contentId={card.id} initial={card.isFavorite} title={card.title} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          {showType ? <TypeLabel card={card} /> : card.category && <p className="eyebrow !text-[10px]">{card.category.name}</p>}
          <h3 className="mt-1 font-medium leading-snug">
            <Link href={href} className="after:absolute after:inset-0">
              {card.title}
            </Link>
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-mute">{card.summary}</p>
        </div>
        <div className="mt-auto grid gap-2.5">
          <Tools card={card} />
          <Meta card={card} />
        </div>
      </div>
    </article>
  )
}

function TypeLabel({ card }: { card: Card }) {
  return (
    <p className="eyebrow flex items-center gap-1.5 !text-[10px] !text-gold-200/80">
      <ContentTypeIcon type={card.type} className="size-3" />
      {CONTENT_TYPE_META[card.type].label}
      {card.category && <span className="text-mute-600">· {card.category.name}</span>}
    </p>
  )
}

export function ratioToAspect(ratio: string | null | undefined): string {
  const match = ratio?.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
  return match ? `${match[1]} / ${match[2]}` : '4 / 5'
}

export function ContentGrid({ children, variant = 'cards' }: { children: React.ReactNode; variant?: 'cards' | 'masonry' }) {
  if (variant === 'masonry')
    return <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">{children}</div>
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div>
}
