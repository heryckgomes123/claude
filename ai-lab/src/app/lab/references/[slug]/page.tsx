import { ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'
import { ratioToAspect } from '@/components/lab/content-card'
import { Cover } from '@/components/lab/cover'
import { DetailHeader, DetailSection, LockedNotice, RelatedGroup, ToolChips } from '@/components/lab/detail'
import { PaletteSwatches } from '@/features/palette-swatches'
import { Badge } from '@/components/ui/badge'
import { detailMetadata, getDetailContext } from '@/features/detail-context'
import { safeExternalUrl } from '@/lib/utils'
import { getReferenceDetail } from '@/server/queries/details'

export async function generateMetadata({ params }: PageProps<'/lab/references/[slug]'>) {
  return detailMetadata('REFERENCE', (await params).slug)
}

export default async function ReferenceDetailPage({ params }: PageProps<'/lab/references/[slug]'>) {
  const { slug } = await params
  const ctx = await getDetailContext('REFERENCE', slug)
  const detail = await getReferenceDetail(ctx.meta.id)
  if (!detail) notFound()
  const { meta, related } = ctx
  const source = safeExternalUrl(detail.sourceUrl)

  return (
    <article className="grid gap-8">
      <DetailHeader ctx={ctx} type="REFERENCE" badges={detail.style ? <Badge variant="gold">{detail.style}</Badge> : null} />
      {ctx.locked ? (
        <LockedNotice />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Cover
            seed={meta.slug}
            type="REFERENCE"
            imageUrl={meta.coverImageUrl}
            palette={detail.palette}
            label={`Referência visual: ${meta.title}`}
            style={{ aspectRatio: ratioToAspect(detail.aspectRatio) }}
            className="max-h-[78dvh] w-full rounded-2xl border border-border"
          />
          <div className="grid content-start gap-4">
            {detail.palette.length > 0 && (
              <DetailSection title="Paleta">
                <PaletteSwatches colors={detail.palette} />
              </DetailSection>
            )}
            <DetailSection title="Direção">
              {meta.description && <p className="text-sm leading-relaxed">{meta.description}</p>}
              {detail.notes && <p className="mt-3 text-sm leading-relaxed text-mute">{detail.notes}</p>}
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                {detail.aspectRatio && (
                  <div>
                    <dt className="text-xs text-mute">Proporção</dt>
                    <dd className="mt-0.5 font-mono">{detail.aspectRatio}</dd>
                  </div>
                )}
                {(detail.sourceName || source) && (
                  <div>
                    <dt className="text-xs text-mute">Fonte</dt>
                    <dd className="mt-0.5">
                      {source ? (
                        <a href={source} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-gold-300 hover:underline">
                          {detail.sourceName ?? new URL(source).hostname} <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        detail.sourceName
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </DetailSection>
            <DetailSection title="Para reproduzir">
              <div className="grid gap-5">
                <ToolChips items={related.compatibleTools} label="Ferramentas" />
                <RelatedGroup title="Prompts" items={related.prompts} empty="Nenhum prompt vinculado ainda." />
                <RelatedGroup title="Workflows" items={related.workflows} />
                <RelatedGroup title="Tutoriais" items={related.tutorials} />
              </div>
            </DetailSection>
          </div>
        </div>
      )}
    </article>
  )
}
