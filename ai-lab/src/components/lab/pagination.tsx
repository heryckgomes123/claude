import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { buildQuery, type ParsedListParams } from '@/lib/list-params'
import { cn } from '@/lib/utils'

export function Pagination({
  path,
  params,
  page,
  pageCount,
}: {
  path: string
  params: ParsedListParams
  page: number
  pageCount: number
}) {
  if (pageCount <= 1) return null
  const href = (p: number) => `${path}${buildQuery({ ...params, page: p === 1 ? undefined : p })}`
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  )
  const itemClass = 'grid h-9 min-w-9 place-items-center rounded-full px-3 text-sm transition-colors'
  return (
    <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(itemClass, 'text-mute hover:bg-bone/5 hover:text-bone')} aria-label="Página anterior">
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-mute-600">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(itemClass, p === page ? 'bg-gold-300 font-medium text-ink-950' : 'text-mute hover:bg-bone/5 hover:text-bone')}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(itemClass, 'text-mute hover:bg-bone/5 hover:text-bone')} aria-label="Próxima página">
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </nav>
  )
}
