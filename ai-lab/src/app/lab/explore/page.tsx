import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CategoryIcon, ContentTypeIcon } from '@/components/lab/content-icons'
import { ContentCard } from '@/components/lab/content-card'
import { PageHeader, SectionHeader } from '@/components/lab/page-header'
import { Rail } from '@/components/lab/rail'
import { CONTENT_TYPE_META, CONTENT_TYPES } from '@/lib/labels'
import { requireMember } from '@/server/auth/viewer'
import { getContentCountsByType, getExploreCategories, getFeatured } from '@/server/queries/content'

export const metadata: Metadata = { title: 'Explorar' }

export default async function ExplorePage() {
  const viewer = await requireMember()
  const [categories, counts, featured] = await Promise.all([
    getExploreCategories(),
    getContentCountsByType(),
    getFeatured(viewer.id, 8),
  ])

  return (
    <div className="grid gap-12">
      <PageHeader
        eyebrow="Explorar"
        title="Comece pelo que você quer criar"
        description="Cada categoria reúne prompts, workflows, referências e tutoriais do mesmo objetivo — o caminho completo em um só lugar."
      />

      <section aria-label="Categorias">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/lab/explore/${c.slug}`} className="lab-card group flex h-full items-start gap-4 rounded-2xl p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold-300/20 bg-gold-300/[0.07]">
                  <CategoryIcon name={c.icon} className="size-5 text-gold-300" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="font-mono text-xs text-mute-600">{c.count}</span>
                  </span>
                  {c.description && <span className="mt-1 block text-sm leading-relaxed text-mute">{c.description}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="by-type">
        <SectionHeader id="by-type" title="Ou navegue por tipo" />
        <ul className="grid gap-3 md:grid-cols-5">
          {CONTENT_TYPES.map((type) => (
            <li key={type}>
              <Link href={CONTENT_TYPE_META[type].path} className="lab-card group flex items-center gap-3 rounded-2xl p-4">
                <ContentTypeIcon type={type} className="size-5 text-gold-300" />
                <span className="flex-1 text-sm font-medium">{CONTENT_TYPE_META[type].plural}</span>
                <span className="font-mono text-xs text-mute-600">{counts[type] ?? 0}</span>
                <ArrowRight className="size-4 text-mute-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-300" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="featured">
          <SectionHeader id="featured" title="Destaques da curadoria" />
          <Rail>
            {featured.map((card) => (
              <ContentCard key={card.id} card={card} showType />
            ))}
          </Rail>
        </section>
      )}
    </div>
  )
}
