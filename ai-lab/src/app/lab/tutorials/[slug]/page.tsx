import { ArrowRight, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BulletList, DetailHeader, DetailSection, LockedNotice, RelatedGroup, ToolChips } from '@/components/lab/detail'
import { Badge } from '@/components/ui/badge'
import { detailMetadata, getDetailContext } from '@/features/detail-context'
import { contentHref } from '@/lib/labels'
import { formatMinutes } from '@/lib/utils'
import { getTutorialDetail } from '@/server/queries/details'

export async function generateMetadata({ params }: PageProps<'/lab/tutorials/[slug]'>) {
  return detailMetadata('TUTORIAL', (await params).slug)
}

export default async function TutorialDetailPage({ params }: PageProps<'/lab/tutorials/[slug]'>) {
  const { slug } = await params
  const ctx = await getDetailContext('TUTORIAL', slug)
  const detail = await getTutorialDetail(ctx.meta.id)
  if (!detail) notFound()
  const { meta, related } = ctx
  const minutes = formatMinutes(detail.estimatedMinutes)

  return (
    <article className="grid gap-8">
      <DetailHeader
        ctx={ctx}
        type="TUTORIAL"
        badges={
          minutes ? (
            <Badge>
              <Clock /> {minutes}
            </Badge>
          ) : null
        }
      />
      {ctx.locked ? (
        <LockedNotice />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid content-start gap-6">
            <DetailSection title="Objetivo">
              <p className="text-[15px] leading-relaxed">{detail.objective}</p>
              {meta.description && <p className="mt-3 text-sm leading-relaxed text-mute">{meta.description}</p>}
            </DetailSection>
            <section aria-labelledby="steps-title">
              <h2 id="steps-title" className="mb-4 text-lg font-semibold">
                Passo a passo
              </h2>
              <ol className="grid gap-3">
                {detail.steps.map((step, i) => (
                  <li key={step.id} className="lab-card rounded-2xl p-5">
                    <div className="flex gap-4">
                      <span className="font-mono text-sm text-gold-300">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-bone/80">{step.body}</p>
                        {step.prompt && (
                          <Link
                            href={contentHref('PROMPT', step.prompt.slug)}
                            className="group mt-3 inline-flex items-center gap-2 rounded-full border border-gold-300/25 bg-gold-300/[0.06] px-3 py-1.5 text-[13px] hover:border-gold-300/50"
                          >
                            <Sparkles className="size-3.5 text-gold-300" aria-hidden /> Praticar com: {step.prompt.title}
                            <ArrowRight className="size-3.5 text-gold-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailSection title="Erros comuns">
                <BulletList items={detail.mistakes} tone="warn" />
              </DetailSection>
              <DetailSection title="Dicas pro">
                <BulletList items={detail.proTips} tone="gold" />
              </DetailSection>
            </div>
          </div>
          <aside className="grid content-start gap-4">
            <DetailSection title="Antes de começar">
              <BulletList items={detail.prerequisites.length ? detail.prerequisites : ['Nenhum pré-requisito']} />
              <div className="mt-5">
                <ToolChips items={related.compatibleTools} />
              </div>
            </DetailSection>
            <DetailSection title="Continue">
              <div className="grid gap-5">
                <RelatedGroup title="Prompts" items={related.prompts} />
                <RelatedGroup title="Workflows" items={related.workflows} />
                <RelatedGroup title="Referências" items={related.references} />
                <RelatedGroup title="Tutoriais" items={related.tutorials} />
              </div>
            </DetailSection>
          </aside>
        </div>
      )}
    </article>
  )
}
