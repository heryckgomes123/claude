import { ArrowRight, ChevronDown, Clock, Settings2, Lightbulb, Sparkles, Wrench } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BulletList, DetailHeader, DetailSection, LockedNotice, RelatedGroup, ToolChips } from '@/components/lab/detail'
import { Badge } from '@/components/ui/badge'
import { detailMetadata, getDetailContext } from '@/features/detail-context'
import { contentHref } from '@/lib/labels'
import { formatMinutes } from '@/lib/utils'
import { getWorkflowDetail } from '@/server/queries/details'

export async function generateMetadata({ params }: PageProps<'/lab/workflows/[slug]'>) {
  return detailMetadata('WORKFLOW', (await params).slug)
}

export default async function WorkflowDetailPage({ params }: PageProps<'/lab/workflows/[slug]'>) {
  const { slug } = await params
  const ctx = await getDetailContext('WORKFLOW', slug)
  const detail = await getWorkflowDetail(ctx.meta.id)
  if (!detail) notFound()
  const { meta, related } = ctx
  const minutes = formatMinutes(detail.estimatedMinutes)

  return (
    <article className="grid gap-8">
      <DetailHeader
        ctx={ctx}
        type="WORKFLOW"
        badges={
          <>
            {minutes && (
              <Badge>
                <Clock /> {minutes}
              </Badge>
            )}
            <Badge variant="mono">{detail.steps.length} etapas</Badge>
          </>
        }
      />
      {ctx.locked ? (
        <LockedNotice />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <DetailSection title="Objetivo" className="lg:col-span-2">
              <p className="text-[15px] leading-relaxed">{detail.objective || meta.summary}</p>
              {meta.description && <p className="mt-3 text-sm leading-relaxed text-mute">{meta.description}</p>}
              {detail.expectedOutput && (
                <div className="mt-5 rounded-xl border border-gold-300/20 bg-gold-300/[0.05] p-4">
                  <p className="eyebrow !text-[10px] !text-gold-200">Você termina com</p>
                  <p className="mt-1.5 text-sm leading-relaxed">{detail.expectedOutput}</p>
                </div>
              )}
            </DetailSection>
            <DetailSection title="Você vai precisar">
              <div className="grid gap-5">
                <div>
                  <p className="mb-2 text-xs text-mute">Entradas</p>
                  <BulletList items={detail.inputs} />
                </div>
                <div className="grid gap-3">
                  <ToolChips items={related.requiredTools} label="Obrigatórias" />
                  <ToolChips items={related.optionalTools} label="Opcionais" />
                </div>
              </div>
            </DetailSection>
          </div>

          <section aria-labelledby="steps-title">
            <h2 id="steps-title" className="mb-5 text-lg font-semibold">
              Etapas
            </h2>
            <ol className="relative grid gap-4 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-gradient-to-b before:from-gold-300/60 before:via-bone/10 before:to-transparent md:before:left-[23px]">
              {detail.steps.map((step, index) => (
                <li key={step.id} className="relative grid grid-cols-[40px_1fr] gap-4 md:grid-cols-[48px_1fr]">
                  <span className="relative z-10 grid size-10 place-items-center rounded-full border border-gold-300/40 bg-ink-900 font-mono text-sm text-gold-200 shadow-[0_0_20px_-6px_rgb(247_201_72/0.6)] md:size-12">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="lab-card rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-base font-semibold">{step.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        {step.tool && (
                          <Link href={contentHref('TOOL', step.tool.slug)}>
                            <Badge className="hover:border-gold-300/40">
                              <Wrench /> {step.tool.title}
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </div>
                    {step.description && <p className="mt-2 text-sm leading-relaxed text-bone/80">{step.description}</p>}
                    {(step.settings || step.tip || step.prompt) && (
                      <div className="mt-4 grid gap-2.5">
                        {step.prompt && (
                          <Link
                            href={contentHref('PROMPT', step.prompt.slug)}
                            className="group flex items-center gap-2 rounded-xl border border-gold-300/20 bg-gold-300/[0.05] px-3 py-2.5 text-sm transition-colors hover:border-gold-300/40"
                          >
                            <Sparkles className="size-4 text-gold-300" aria-hidden />
                            <span className="text-mute">Prompt:</span>
                            <span className="font-medium">{step.prompt.title}</span>
                            <ArrowRight className="ml-auto size-4 text-gold-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
                          </Link>
                        )}
                        {step.settings && (
                          <p className="flex gap-2 text-[13px] text-mute">
                            <Settings2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            <span className="font-mono">{step.settings}</span>
                          </p>
                        )}
                        {step.tip && (
                          <p className="flex gap-2 text-[13px] text-mute">
                            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-gold-300" aria-hidden />
                            {step.tip}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <DetailSection title="Solução de problemas">
              {detail.troubleshooting.length ? (
                <div className="grid gap-2">
                  {detail.troubleshooting.map((t) => (
                    <details key={t.problem} className="group rounded-xl border border-border bg-ink-900 px-4 py-3 open:border-bone/15">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                        {t.problem}
                        <ChevronDown className="size-4 shrink-0 text-mute transition-transform group-open:rotate-180" aria-hidden />
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-mute">{t.solution}</p>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-mute-600">—</p>
              )}
            </DetailSection>
            <DetailSection title="Alternativas">
              <BulletList items={detail.alternatives} />
            </DetailSection>
          </div>

          <section className="grid gap-6 rounded-2xl border border-border p-5 md:grid-cols-3 md:p-6">
            <RelatedGroup title="Prompts deste workflow" items={related.prompts} empty="—" />
            <RelatedGroup title="Referências" items={related.references} empty="—" />
            <RelatedGroup title="Tutoriais" items={related.tutorials} empty="—" />
          </section>
        </>
      )}
    </article>
  )
}
