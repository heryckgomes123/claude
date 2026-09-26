import { Search, SearchX } from 'lucide-react'
import type { Metadata } from 'next'
import Form from 'next/form'
import Link from 'next/link'
import { ContentTypeIcon } from '@/components/lab/content-icons'
import { Highlight } from '@/components/lab/highlight'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { Badge } from '@/components/ui/badge'
import { CONTENT_TYPE_META, CONTENT_TYPES, contentHref, type ContentType } from '@/lib/labels'
import { cn, pluralize } from '@/lib/utils'
import { requireMember } from '@/server/auth/viewer'
import { getSearchProvider } from '@/server/services/search/postgres'
import type { SearchResult } from '@/server/services/search/types'

export const metadata: Metadata = { title: 'Busca' }

export default async function SearchPage({ searchParams }: PageProps<'/lab/search'>) {
  await requireMember()
  const raw = await searchParams
  const q = (Array.isArray(raw.q) ? raw.q[0] : raw.q)?.trim().slice(0, 120) ?? ''
  const typeParam = Array.isArray(raw.type) ? raw.type[0] : raw.type
  const type = (CONTENT_TYPES as readonly string[]).includes(typeParam ?? '') ? (typeParam as ContentType) : undefined

  let results: SearchResult[] = []
  let failed = false
  if (q) {
    try {
      results = await getSearchProvider().search(q, { limit: 50 })
    } catch (error) {
      console.error('[search page]', error)
      failed = true
    }
  }
  const visible = type ? results.filter((r) => r.type === type) : results
  const countByType = Object.fromEntries(CONTENT_TYPES.map((t) => [t, results.filter((r) => r.type === t).length]))

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Busca global" title={q ? `Resultados para “${q}”` : 'Buscar no Lab'} description="Prompts, workflows, ferramentas, referências e tutoriais — sem precisar acertar o nome exato." />
      <Form action="/lab/search" role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mute-600" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus={!q}
          maxLength={120}
          placeholder="Ex.: fotografia de produto, vídeo para academia, upscale…"
          aria-label="Buscar no Lab"
          className="h-14 w-full rounded-2xl border border-input bg-ink-900 pl-12 pr-4 text-base outline-none transition-colors placeholder:text-mute-600 focus:border-gold-300/60 focus:ring-2 focus:ring-gold-300/20"
        />
      </Form>

      {q && !failed && results.length > 0 && (
        <nav aria-label="Filtrar por tipo" className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
          <TypeTab href={`/lab/search?q=${encodeURIComponent(q)}`} active={!type} label={`Tudo (${results.length})`} />
          {CONTENT_TYPES.filter((t) => countByType[t] > 0).map((t) => (
            <TypeTab
              key={t}
              href={`/lab/search?q=${encodeURIComponent(q)}&type=${t}`}
              active={type === t}
              label={`${CONTENT_TYPE_META[t].plural} (${countByType[t]})`}
            />
          ))}
        </nav>
      )}

      {failed ? (
        <EmptyState icon={<SearchX className="size-5" />} title="A busca falhou" description="Tente novamente em instantes." />
      ) : q && visible.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="Nada encontrado"
          description="Tente palavras mais amplas ou o objetivo da criação: “anúncio”, “produto”, “retrato”, “vídeo”."
        />
      ) : (
        <div className="grid gap-3">
          {q && <p className="text-sm text-mute">{pluralize(visible.length, 'resultado', 'resultados')}</p>}
          <ol className="grid gap-3">
            {visible.map((r) => (
              <li key={r.id}>
                <Link href={contentHref(r.type, r.slug)} className="lab-card group flex gap-4 rounded-2xl p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bone/[0.04]">
                    <ContentTypeIcon type={r.type} className="size-[18px] text-gold-300" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant="mono">{CONTENT_TYPE_META[r.type].label}</Badge>
                      {r.categoryName && <span className="text-xs text-mute-600">{r.categoryName}</span>}
                    </span>
                    <span className="mt-1.5 block font-medium group-hover:text-gold-100">{r.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-mute">{r.summary}</span>
                    <span className="mt-3 block rounded-xl border border-border bg-ink-950/40 px-3 py-2 text-[13px] leading-relaxed">
                      <span className="eyebrow !text-[9px] !text-gold-200/80">Por que é relevante · </span>
                      <span className="text-bone/80">{r.reasons.join(' · ')}</span>
                      {r.highlight && (
                        <span className="mt-1 block text-mute">
                          “…<Highlight text={r.highlight} />…”
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function TypeTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors',
        active ? 'border-gold-300/40 bg-gold-300/10 text-gold-100' : 'border-border text-mute hover:text-bone',
      )}
    >
      {label}
    </Link>
  )
}

