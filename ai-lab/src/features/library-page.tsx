import { SearchX } from 'lucide-react'
import Link from 'next/link'
import { ContentCard, ContentGrid } from '@/components/lab/content-card'
import { FilterBar } from '@/components/lab/filter-bar'
import { EmptyState, HowTo, PageHeader } from '@/components/lab/page-header'
import { Pagination } from '@/components/lab/pagination'
import { Button } from '@/components/ui/button'
import { CONTENT_TYPE_META, type ContentType, type MediaType } from '@/lib/labels'
import { parseListParams } from '@/lib/list-params'
import { pluralize } from '@/lib/utils'
import { requireMember } from '@/server/auth/viewer'
import { getFilterOptions, listContent } from '@/server/queries/content'

type FilterKey = 'category' | 'tag' | 'tool' | 'difficulty' | 'media' | 'pricing' | 'time'

export async function LibraryPage({
  type,
  searchParams,
  eyebrow,
  title,
  description,
  howTo,
  filters,
  searchPlaceholder,
  mediaOptions,
  layout = 'cards',
  headerActions,
}: {
  type: ContentType
  searchParams: Promise<Record<string, string | string[] | undefined>>
  eyebrow: string
  title: string
  description: string
  howTo: string[]
  filters: FilterKey[]
  searchPlaceholder: string
  mediaOptions?: readonly MediaType[]
  layout?: 'cards' | 'masonry'
  headerActions?: React.ReactNode
}) {
  const viewer = await requireMember()
  const params = parseListParams(await searchParams)
  const path = CONTENT_TYPE_META[type].path
  const [result, options] = await Promise.all([
    listContent({ type, ...params }, viewer.id),
    getFilterOptions(type),
  ])
  const filtered = Boolean(params.q || filters.some((f) => params[f]))

  return (
    <div className="grid gap-8">
      <div>
        <PageHeader eyebrow={eyebrow} title={title} description={description}>
          {headerActions}
        </PageHeader>
        <HowTo steps={howTo} />
      </div>

      <FilterBar
        action={path}
        values={params}
        filters={filters}
        options={options}
        searchPlaceholder={searchPlaceholder}
        mediaOptions={mediaOptions}
      />

      <section aria-labelledby="results-title" className="grid gap-4">
        <p id="results-title" className="text-sm text-mute" aria-live="polite">
          {pluralize(result.total, 'resultado', 'resultados')}
          {filtered ? ' com os filtros atuais' : ''}
        </p>
        {result.items.length > 0 ? (
          <ContentGrid variant={layout}>
            {result.items.map((card) => (
              <ContentCard key={card.id} card={card} />
            ))}
          </ContentGrid>
        ) : (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title={filtered ? 'Nada encontrado com esses filtros' : `Ainda não há ${CONTENT_TYPE_META[type].plural.toLowerCase()} publicados`}
            description={
              filtered
                ? 'Remova um filtro ou tente termos mais amplos — a busca aceita partes de palavras e ignora acentos.'
                : 'Novos conteúdos entram no Lab com frequência. Enquanto isso, explore as outras áreas.'
            }
            action={
              filtered ? (
                <Button asChild variant="secondary">
                  <Link href={path}>Limpar filtros</Link>
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link href="/lab/explore">Explorar o Lab</Link>
                </Button>
              )
            }
          />
        )}
        <Pagination path={path} params={params} page={result.page} pageCount={result.pageCount} />
      </section>
    </div>
  )
}
