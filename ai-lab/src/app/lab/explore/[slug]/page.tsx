import { ArrowLeft, Layers } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContentCard, ContentGrid } from '@/components/lab/content-card'
import { CategoryIcon } from '@/components/lab/content-icons'
import { EmptyState, SectionHeader } from '@/components/lab/page-header'
import { CONTENT_TYPE_META, CONTENT_TYPES } from '@/lib/labels'
import { requireMember } from '@/server/auth/viewer'
import { getCategoryBySlug, getCategoryContent } from '@/server/queries/content'

export async function generateMetadata({ params }: PageProps<'/lab/explore/[slug]'>) {
  const { slug } = await params
  const category = /^[a-z0-9-]{1,96}$/.test(slug) ? await getCategoryBySlug(slug) : null
  return { title: category?.name ?? 'Explorar' }
}

// Ordem pensada como caminho: entender → inspirar → executar → aprofundar
const ORDER = ['WORKFLOW', 'PROMPT', 'REFERENCE', 'TUTORIAL', 'TOOL'] as const

export default async function CategoryPage({ params }: PageProps<'/lab/explore/[slug]'>) {
  const viewer = await requireMember()
  const { slug } = await params
  if (!/^[a-z0-9-]{1,96}$/.test(slug)) notFound()
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()
  const cards = await getCategoryContent(category.id, viewer.id)

  return (
    <div className="grid gap-10">
      <header className="grid gap-4">
        <Link href="/lab/explore" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-bone">
          <ArrowLeft className="size-4" aria-hidden /> Explorar
        </Link>
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-gold-300/25 bg-gold-300/[0.07]">
            <CategoryIcon name={category.icon} className="size-6 text-gold-300" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{category.name}</h1>
            {category.description && <p className="mt-2 max-w-2xl text-mute">{category.description}</p>}
          </div>
        </div>
      </header>

      {cards.length === 0 ? (
        <EmptyState icon={<Layers className="size-5" />} title="Ainda não há conteúdo publicado nesta categoria" />
      ) : (
        ORDER.filter((t) => (CONTENT_TYPES as readonly string[]).includes(t)).map((type) => {
          const items = cards.filter((c) => c.type === type)
          if (!items.length) return null
          return (
            <section key={type} aria-labelledby={`sec-${type}`}>
              <SectionHeader id={`sec-${type}`} title={CONTENT_TYPE_META[type].plural} description={CONTENT_TYPE_META[type].description} />
              <ContentGrid>
                {items.map((card) => (
                  <ContentCard key={card.id} card={card} />
                ))}
              </ContentGrid>
            </section>
          )
        })
      )}
    </div>
  )
}
