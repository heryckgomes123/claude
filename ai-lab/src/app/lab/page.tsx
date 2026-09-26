import { ArrowRight, BookOpen, Megaphone, Sparkles, Wand2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CategoryIcon, ContentTypeIcon } from '@/components/lab/content-icons'
import { ContentCard } from '@/components/lab/content-card'
import { SectionHeader } from '@/components/lab/page-header'
import { Rail } from '@/components/lab/rail'
import { Button } from '@/components/ui/button'
import { CONTENT_TYPE_META, CONTENT_TYPES, contentHref } from '@/lib/labels'
import { relativeTime } from '@/lib/utils'
import { requireMember } from '@/server/auth/viewer'
import {
  getContentCountsByType,
  getExploreCategories,
  getLatest,
  getPopular,
  getRecommended,
  getStarterTutorial,
} from '@/server/queries/content'
import { getPublishedUpdates } from '@/server/queries/updates'
import { getRecentByAction } from '@/server/queries/user-space'

export const metadata: Metadata = { title: 'Home' }

export default async function LabHome() {
  const viewer = await requireMember()
  const [counts, latest, updates, recent, popular, recommended, categories, starter] = await Promise.all([
    getContentCountsByType(),
    getLatest(viewer.id, 6),
    getPublishedUpdates(3),
    getRecentByAction(viewer.id, ['VIEW', 'COPY'], 4),
    getPopular(viewer.id, ['PROMPT', 'WORKFLOW'], 4),
    getRecommended(viewer.id, 4),
    getExploreCategories(),
    getStarterTutorial(),
  ])
  const firstName = viewer.name.trim().split(/\s+/)[0]

  return (
    <div className="grid gap-14">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-ink-900 px-6 py-10 md:px-10 md:py-14">
        <div className="lab-grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(247_201_72/0.16),transparent)]"
          aria-hidden
        />
        <div className="relative max-w-3xl">
          <p className="eyebrow animate-fade-up">INTELRA AI LAB · Olá, {firstName}</p>
          <h1 className="display mt-4 animate-fade-up text-[clamp(2.4rem,6vw,4.6rem)] [animation-delay:60ms]">
            Transforme ideias em <span className="text-gold">criação.</span>
          </h1>
          <p className="mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-mute [animation-delay:120ms] md:text-lg">
            Este é o seu laboratório de criação com IA. Escolha o que quer criar — o Lab mostra o prompt, a ferramenta e o
            caminho até o resultado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-fade-up [animation-delay:180ms]">
            <Button asChild variant="primary" size="lg">
              <Link href="/lab/explore">
                Começar a explorar <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/lab/prompt-builder">
                <Wand2 /> Prompt Builder
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* EXPLORE — áreas */}
      <section aria-labelledby="areas-title">
        <SectionHeader id="areas-title" title="Explore o Lab" description="Cinco áreas conectadas entre si." />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {CONTENT_TYPES.map((type) => (
            <li key={type}>
              <Link href={CONTENT_TYPE_META[type].path} className="lab-card group flex h-full flex-col gap-3 rounded-2xl p-4 md:p-5">
                <span className="flex items-center justify-between">
                  <ContentTypeIcon type={type} className="size-5 text-gold-300" />
                  <span className="font-mono text-xs text-mute-600">{counts[type] ?? 0}</span>
                </span>
                <span>
                  <span className="block font-medium">{CONTENT_TYPE_META[type].plural}</span>
                  <span className="mt-1 hidden text-xs leading-relaxed text-mute sm:block">{CONTENT_TYPE_META[type].description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* CONTINUE CRIANDO */}
      <section aria-labelledby="continue-title">
        <SectionHeader
          id="continue-title"
          title="Continue criando"
          description={recent.length ? 'De onde você parou.' : 'Seu primeiro passo no Lab.'}
          action={
            recent.length ? (
              <Link href="/lab/my-lab?tab=recent" className="text-sm text-mute hover:text-gold-200">
                Histórico
              </Link>
            ) : null
          }
        />
        {recent.length ? (
          <Rail>
            {recent.map((card) => (
              <ContentCard key={card.id} card={card} showType />
            ))}
          </Rail>
        ) : starter ? (
          <Link href={`/lab/tutorials/${starter.slug}`} className="lab-card flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold-300/10">
              <BookOpen className="size-5 text-gold-300" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-medium">Comece por aqui: {starter.title}</span>
              <span className="mt-1 block text-sm text-mute">{starter.summary}</span>
            </span>
            <ArrowRight className="hidden size-5 text-gold-300 sm:block" aria-hidden />
          </Link>
        ) : (
          <p className="text-sm text-mute-600">Os conteúdos que você abrir aparecem aqui.</p>
        )}
      </section>

      {/* HOJE NO LAB */}
      <section aria-labelledby="today-title" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <SectionHeader id="today-title" title="Hoje no Lab" description="O que entrou por último." />
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {latest.map((card) => (
              <ContentCard key={card.id} card={card} showType />
            ))}
          </div>
        </div>
        <aside aria-labelledby="updates-title">
          <SectionHeader id="updates-title" title="Novidades" />
          <ul className="grid gap-3">
            {updates.map((u) => (
              <li key={u.id} className="rounded-2xl border border-border bg-ink-900/60 p-4">
                <p className="flex items-center gap-2 text-xs text-mute-600">
                  <Megaphone className="size-3.5 text-gold-300" aria-hidden />
                  {u.publishedAt ? relativeTime(u.publishedAt) : ''}
                </p>
                <p className="mt-2 text-sm font-medium">{u.title}</p>
                {u.body && <p className="mt-1 text-[13px] leading-relaxed text-mute">{u.body}</p>}
                {u.contentSlug && u.contentType && u.contentStatus === 'PUBLISHED' && (
                  <Link href={contentHref(u.contentType, u.contentSlug)} className="mt-2 inline-flex items-center gap-1 text-[13px] text-gold-300 hover:underline">
                    Abrir <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </li>
            ))}
            {updates.length === 0 && <li className="text-sm text-mute-600">Nenhuma novidade publicada.</li>}
          </ul>
        </aside>
      </section>

      {/* CATEGORIAS */}
      <section aria-labelledby="categories-title">
        <SectionHeader
          id="categories-title"
          title="O que você quer criar?"
          action={
            <Link href="/lab/explore" className="text-sm text-mute hover:text-gold-200">
              Ver tudo
            </Link>
          }
        />
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/lab/explore/${c.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-ink-900/60 px-4 py-2 text-sm transition-colors hover:border-gold-300/40 hover:text-gold-100"
              >
                <CategoryIcon name={c.icon} className="size-4 text-gold-300" />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* POPULARES */}
      {popular.length > 0 && (
        <section aria-labelledby="popular-title">
          <SectionHeader id="popular-title" title="Populares" description="Os prompts e workflows mais usados pelos membros." />
          <Rail>
            {popular.map((card) => (
              <ContentCard key={card.id} card={card} showType />
            ))}
          </Rail>
        </section>
      )}

      {/* RECOMENDADOS */}
      {recommended.length > 0 && (
        <section aria-labelledby="recommended-title">
          <SectionHeader
            id="recommended-title"
            title="Recomendados para você"
            description={recent.length ? 'Com base no que você viu e favoritou.' : 'Destaques da curadoria INTELRA.'}
          />
          <Rail>
            {recommended.map((card) => (
              <ContentCard key={card.id} card={card} showType />
            ))}
          </Rail>
        </section>
      )}

      <p className="flex items-center justify-center gap-2 pb-4 font-mono text-[11px] tracking-[0.2em] text-mute-600">
        <Sparkles className="size-3.5 text-gold-300" aria-hidden /> DESCOBRIR → APRENDER → EXPERIMENTAR → CRIAR → SALVAR → MELHORAR
      </p>
    </div>
  )
}
