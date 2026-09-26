import { ArrowLeft, ArrowUpRight, ExternalLink, Pencil, Trophy } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CopyButton } from '@/components/lab/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExperimentForm } from '@/features/experiment-form'
import { DeleteExperimentButton } from '@/features/experiment-actions'
import { contentHref } from '@/lib/labels'
import { cn, relativeTime, safeExternalUrl } from '@/lib/utils'
import { ENTITLEMENTS } from '@/server/access/entitlements'
import { requireMember, viewerHas } from '@/server/auth/viewer'
import { listPickable } from '@/server/queries/content'
import { getExperiment } from '@/server/queries/user-space'

export const metadata: Metadata = { title: 'Experimento' }

export default async function ExperimentPage({ params, searchParams }: PageProps<'/lab/experiments/[id]'>) {
  const viewer = await requireMember()
  const { id } = await params
  const { edit } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id) || !viewerHas(viewer, ENTITLEMENTS.EXPERIMENTS)) notFound()
  // Escopo por dono: experimento de outro usuário responde 404.
  const experiment = await getExperiment(viewer.id, id)
  if (!experiment) notFound()

  if (edit === '1') {
    const pickable = await listPickable(['TOOL', 'PROMPT'])
    return (
      <div className="grid gap-8">
        <Link href={`/lab/experiments/${id}`} className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-bone">
          <ArrowLeft className="size-4" aria-hidden /> Voltar
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Editar experimento</h1>
        <ExperimentForm
          tools={pickable.filter((p) => p.type === 'TOOL')}
          prompts={pickable.filter((p) => p.type === 'PROMPT')}
          initial={{
            id: experiment.id,
            title: experiment.title,
            objective: experiment.objective,
            toolId: experiment.toolId,
            sourcePromptId: experiment.sourcePromptId,
            notes: experiment.notes,
            variants: experiment.variants.map((v) => ({
              label: v.label,
              prompt: v.prompt,
              parameters: v.parameters ?? '',
              observations: v.observations ?? '',
              result: v.result ?? '',
              resultUrl: v.resultUrl ?? '',
              score: v.score === null ? '' : String(v.score),
            })),
          }}
        />
      </div>
    )
  }

  const best = Math.max(-1, ...experiment.variants.map((v) => v.score ?? -1))

  return (
    <div className="grid gap-8">
      <header className="grid gap-4">
        <Link href="/lab/experiments" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-bone">
          <ArrowLeft className="size-4" aria-hidden /> Experimentos
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Experimento · atualizado {relativeTime(experiment.updatedAt)}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{experiment.title}</h1>
            {experiment.objective && <p className="mt-2 text-mute">{experiment.objective}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {experiment.tool && (
                <Link href={contentHref('TOOL', experiment.tool.slug)}>
                  <Badge className="hover:border-gold-300/40">{experiment.tool.title}</Badge>
                </Link>
              )}
              {experiment.sourcePrompt && (
                <Link href={contentHref('PROMPT', experiment.sourcePrompt.slug)} className="inline-flex items-center gap-1 text-sm text-gold-300 hover:underline">
                  Prompt de origem: {experiment.sourcePrompt.title} <ArrowUpRight className="size-3.5" />
                </Link>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/lab/experiments/${id}?edit=1`}>
                <Pencil /> Editar
              </Link>
            </Button>
            <DeleteExperimentButton id={experiment.id} />
          </div>
        </div>
      </header>

      <section aria-labelledby="compare-title">
        <h2 id="compare-title" className="mb-4 text-lg font-semibold">
          Comparação
        </h2>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
          {experiment.variants.map((v) => {
            const winner = v.score !== null && v.score === best && best >= 0
            const url = safeExternalUrl(v.resultUrl)
            return (
              <article
                key={v.id}
                className={cn(
                  'grid w-[85vw] shrink-0 snap-start content-start gap-4 rounded-2xl border bg-ink-900/70 p-5 md:w-auto',
                  winner ? 'border-gold-300/50 shadow-[0_0_40px_-18px_rgb(247_201_72/0.6)]' : 'border-border',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-full border border-gold-300/40 font-mono text-sm text-gold-200">{v.label}</span>
                  {v.score !== null && (
                    <Badge variant={winner ? 'gold' : 'default'}>
                      {winner && <Trophy />} {v.score}/10
                    </Badge>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-ink-950/50 p-3">
                  <p className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-bone/85">{v.prompt}</p>
                  <div className="mt-2 flex justify-end">
                    <CopyButton text={v.prompt} size="sm" variant="ghost" />
                  </div>
                </div>
                {v.parameters && <p className="font-mono text-xs text-mute">{v.parameters}</p>}
                {v.observations && (
                  <div>
                    <p className="eyebrow !text-[10px]">Observações</p>
                    <p className="mt-1 text-sm leading-relaxed text-bone/85">{v.observations}</p>
                  </div>
                )}
                {v.result && (
                  <div>
                    <p className="eyebrow !text-[10px]">Resultado</p>
                    <p className="mt-1 text-sm leading-relaxed text-bone/85">{v.result}</p>
                  </div>
                )}
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-gold-300 hover:underline">
                    Ver resultado <ExternalLink className="size-3.5" />
                  </a>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {experiment.notes && (
        <section className="rounded-2xl border border-border bg-ink-900/60 p-5">
          <h2 className="eyebrow mb-3">Conclusões</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{experiment.notes}</p>
        </section>
      )}
    </div>
  )
}

