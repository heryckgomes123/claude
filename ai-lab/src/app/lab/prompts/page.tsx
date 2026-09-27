import { Search, SearchX } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { PromptGrid } from '@/components/lab/prompt-card'
import { Button } from '@/components/ui/button'
import { cn, pluralize } from '@/lib/utils'
import { requireMember } from '@/server/auth/viewer'
import { listPrompts, promptCategories } from '@/server/queries'

export const metadata: Metadata = { title: 'Prompts' }

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? ''
}

export default async function PromptsPage({ searchParams }: PageProps<'/lab/prompts'>) {
  const viewer = await requireMember()
  const params = await searchParams
  const q = one(params.q)
  const category = one(params.categoria)
  const [prompts, categories] = await Promise.all([
    listPrompts(viewer.id, { q, category: category || undefined }),
    promptCategories(),
  ])
  const total = categories.reduce((sum, c) => sum + c.total, 0)
  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1.5 text-[13px] transition-colors',
      active ? 'border-gold-300/50 bg-gold-300/10 text-gold-200' : 'border-border text-bone/80 hover:border-bone/25 hover:text-bone',
    )
  const withParams = (next: { q?: string; categoria?: string }) => {
    const search = new URLSearchParams()
    if (next.q) search.set('q', next.q)
    if (next.categoria) search.set('categoria', next.categoria)
    const s = search.toString()
    return s ? `/lab/prompts?${s}` : '/lab/prompts'
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Biblioteca"
        title="Prompts"
        description="Escolha, personalize os campos destacados e copie para a sua ferramenta de IA."
      />

      <form role="search" action="/lab/prompts" className="relative">
        {category && <input type="hidden" name="categoria" value={category} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-mute" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          aria-label="Buscar prompts"
          placeholder="Buscar prompts…"
          className="h-12 w-full rounded-2xl border border-input bg-ink-900/80 pl-11 pr-28 text-[15px] text-bone placeholder:text-bone/35 focus-visible:border-gold-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/20"
        />
        <Button type="submit" size="sm" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2">
          Buscar
        </Button>
      </form>

      <nav aria-label="Categorias" className="flex flex-wrap gap-2">
        <Link href={withParams({ q })} className={chip(!category)} aria-current={!category ? 'page' : undefined}>
          Todos ({total})
        </Link>
        {categories.map((c) => (
          <Link
            key={c.name}
            href={withParams({ q, categoria: c.name })}
            className={chip(category === c.name)}
            aria-current={category === c.name ? 'page' : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {prompts.length ? (
        <div>
          <p className="mb-3 text-sm text-mute" aria-live="polite">
            {pluralize(prompts.length, 'prompt', 'prompts')}
            {q && ` para “${q}”`}
          </p>
          <PromptGrid prompts={prompts} />
        </div>
      ) : (
        <EmptyState
          icon={<SearchX className="size-5" />}
          title={total ? 'Nenhum prompt encontrado' : 'Nenhum prompt publicado ainda'}
          description={total ? 'Tente outra palavra ou veja todas as categorias.' : 'Os prompts aparecem aqui assim que o professor publicar.'}
          action={
            total ? (
              <Button asChild variant="secondary">
                <Link href="/lab/prompts">Ver todos</Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
