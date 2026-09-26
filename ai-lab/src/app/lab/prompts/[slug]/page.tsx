import { FlaskConical, Ratio } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Cover } from '@/components/lab/cover'
import { BulletList, DetailHeader, DetailSection, KeyValueList, LockedNotice, RelatedGroup, ToolChips } from '@/components/lab/detail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { detailMetadata, getDetailContext } from '@/features/detail-context'
import { PromptWorkbench } from '@/features/prompt-workbench'
import { MEDIA_LABELS } from '@/lib/labels'
import { getPromptDetail } from '@/server/queries/details'

export async function generateMetadata({ params }: PageProps<'/lab/prompts/[slug]'>) {
  return detailMetadata('PROMPT', (await params).slug)
}

export default async function PromptDetailPage({ params }: PageProps<'/lab/prompts/[slug]'>) {
  const { slug } = await params
  const ctx = await getDetailContext('PROMPT', slug)
  const detail = await getPromptDetail(ctx.meta.id)
  if (!detail) notFound()
  const { meta, related } = ctx
  const tools = [...related.compatibleTools, ...related.requiredTools]

  return (
    <article className="grid gap-8">
      <DetailHeader
        ctx={ctx}
        type="PROMPT"
        badges={
          <>
            <Badge variant="mono">{MEDIA_LABELS[detail.mediaType]}</Badge>
            {detail.aspectRatio && (
              <Badge>
                <Ratio /> {detail.aspectRatio}
              </Badge>
            )}
            <Badge variant="mono">v{detail.currentVersion}</Badge>
          </>
        }
      />

      {ctx.locked ? (
        <LockedNotice />
      ) : (
        <>
          <ToolChips items={tools} label="Funciona com" />
          <PromptWorkbench
            contentId={meta.id}
            body={detail.body}
            negativePrompt={detail.negativePrompt}
            variables={detail.variables}
            canSave={meta.status === 'PUBLISHED'}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <DetailSection title="Resultado esperado" className="lg:col-span-2">
              <div className="grid gap-5 md:grid-cols-[200px_1fr]">
                <Cover
                  seed={meta.slug}
                  type="PROMPT"
                  imageUrl={meta.coverImageUrl}
                  label={meta.coverImageUrl ? `Prévia de ${meta.title}` : undefined}
                  className="aspect-[4/5] rounded-xl"
                />
                <div className="grid content-start gap-4">
                  <p className="text-sm leading-relaxed text-bone/85">{detail.expectedResult ?? '—'}</p>
                  {meta.description && <p className="text-sm leading-relaxed text-mute">{meta.description}</p>}
                  {!meta.coverImageUrl && (
                    <p className="text-xs text-mute-600">Prévia visual ilustrativa — o resultado real depende da ferramenta e das variáveis.</p>
                  )}
                </div>
              </div>
            </DetailSection>
            <DetailSection title="Parâmetros">
              <KeyValueList items={detail.parameters} />
            </DetailSection>
            <DetailSection title="Configurações recomendadas">
              <KeyValueList items={detail.recommendedSettings} />
            </DetailSection>
            <DetailSection title="Dicas" className="lg:col-span-2">
              <BulletList items={detail.tips} tone="gold" />
            </DetailSection>
          </div>

          <section aria-labelledby="next-title" className="grid gap-6 rounded-2xl border border-border p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="next-title" className="text-lg font-semibold">
                  Próximo passo
                </h2>
                <p className="text-sm text-mute">Onde este prompt se encaixa no caminho da criação.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/lab/experiments/new?prompt=${meta.slug}`}>
                  <FlaskConical /> Testar num experimento
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <RelatedGroup title="Workflows que usam" items={related.workflows} empty="Nenhum workflow ainda." />
              <RelatedGroup title="Prompts relacionados" items={related.prompts} empty="—" />
              <RelatedGroup title="Referências" items={related.references} empty="—" />
              <RelatedGroup title="Aprenda a técnica" items={related.tutorials} empty="—" />
            </div>
          </section>
        </>
      )}
    </article>
  )
}
