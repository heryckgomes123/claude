import { ArrowRight, BookOpen, Heart, Search, Sparkles, Wrench } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, SectionHeader } from '@/components/lab/page-header'
import { ProgressBar } from '@/components/lab/progress-bar'
import { PromptGrid } from '@/components/lab/prompt-card'
import { Button } from '@/components/ui/button'
import { requireMember } from '@/server/auth/viewer'
import { homeData, promptCategories } from '@/server/queries'

export const metadata: Metadata = { title: 'Início' }

export default async function LabHome() {
  const viewer = await requireMember()
  const [data, categories] = await Promise.all([homeData(viewer.id), promptCategories()])
  const firstName = viewer.name.split(' ')[0]

  return (
    <div className="grid gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-ink-900 p-6 sm:p-10">
        <div className="lab-grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(247_201_72/0.16),transparent)]"
          aria-hidden
        />
        <div className="relative max-w-2xl">
          <p className="eyebrow">Olá, {firstName}</p>
          <h1 className="display mt-3 text-[clamp(2.2rem,5.4vw,3.6rem)]">
            O que você quer <span className="text-gold">criar hoje?</span>
          </h1>
          <form action="/lab/prompts" role="search" className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mute" aria-hidden />
            <input
              name="q"
              aria-label="Buscar prompts"
              placeholder="Ex.: foto de produto, vídeo, retrato…"
              className="h-13 w-full rounded-2xl border border-input bg-ink-950/70 pl-12 pr-4 text-base text-bone placeholder:text-bone/35 focus-visible:border-gold-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/20"
            />
          </form>
          {categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.slice(0, 8).map((c) => (
                <Link
                  key={c.name}
                  href={`/lab/prompts?categoria=${encodeURIComponent(c.name)}`}
                  className="rounded-full border border-border bg-bone/[0.03] px-3 py-1.5 text-[13px] text-bone/80 transition-colors hover:border-gold-300/40 hover:text-gold-200"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-4 rounded-2xl border border-border bg-ink-900/70 p-5">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">Seus estudos</h2>
            <span className="font-mono text-xs text-mute">
              {data.lessonsDone}/{data.lessonsTotal} aulas
            </span>
          </div>
          <ProgressBar value={data.lessonsDone} total={data.lessonsTotal} label="Progresso nas aulas" />
          {data.nextLesson ? (
            <>
              <div>
                <p className="text-xs text-mute">Próxima aula · {data.nextLesson.module}</p>
                <p className="mt-1 font-medium">{data.nextLesson.title}</p>
              </div>
              <Button asChild variant="primary" className="justify-self-start">
                <Link href={`/lab/aulas/${data.nextLesson.slug}`}>
                  {data.lessonsDone ? 'Continuar estudando' : 'Começar a primeira aula'} <ArrowRight />
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-mute">
              {data.lessonsTotal ? 'Você concluiu todas as aulas. 🎉' : 'As aulas aparecem aqui assim que forem publicadas.'}
            </p>
          )}
        </div>
        <div className="grid content-start gap-3 rounded-2xl border border-border bg-ink-900/70 p-5">
          <h2 className="eyebrow">Como usar</h2>
          <ol className="grid gap-2.5 text-sm text-bone/85">
            {[
              'Escolha um prompt pela categoria ou pela busca',
              'Clique em Copiar e cole na ferramenta de IA',
              'Salve os melhores nos Favoritos',
              'Siga as Aulas para dominar a técnica',
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-gold-300/30 font-mono text-[11px] text-gold-200">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <nav aria-label="Atalhos" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: '/lab/prompts', label: 'Prompts', value: data.promptTotal, icon: Sparkles },
          { href: '/lab/aulas', label: 'Aulas', value: data.lessonsTotal, icon: BookOpen },
          { href: '/lab/ferramentas', label: 'Ferramentas', value: data.toolTotal, icon: Wrench },
          { href: '/lab/favoritos', label: 'Favoritos', value: data.favoriteTotal, icon: Heart },
        ].map(({ href, label, value, icon: Icon }) => (
          <Link key={href} href={href} className="lab-card flex items-center gap-3 rounded-2xl p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-gold-300/10 text-gold-300">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="block font-mono text-xs text-mute">{value}</span>
            </span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="novos">
        <SectionHeader
          id="novos"
          title="Novos prompts"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/lab/prompts">
                Ver todos <ArrowRight />
              </Link>
            </Button>
          }
        />
        {data.latest.length ? (
          <PromptGrid prompts={data.latest} />
        ) : (
          <EmptyState icon={<Sparkles className="size-5" />} title="Os prompts aparecem aqui assim que forem publicados" />
        )}
      </section>
    </div>
  )
}
