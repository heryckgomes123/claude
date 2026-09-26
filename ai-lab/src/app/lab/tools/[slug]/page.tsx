import { ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react'
import { notFound } from 'next/navigation'
import { BulletList, DetailHeader, DetailSection, LockedNotice, RelatedGroup } from '@/components/lab/detail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { detailMetadata, getDetailContext } from '@/features/detail-context'
import { MEDIA_LABELS, PRICING_LABELS, VERIFICATION_LABELS } from '@/lib/labels'
import { cn, formatDate, safeExternalUrl } from '@/lib/utils'
import { getToolDetail } from '@/server/queries/details'

export async function generateMetadata({ params }: PageProps<'/lab/tools/[slug]'>) {
  return detailMetadata('TOOL', (await params).slug)
}

export default async function ToolDetailPage({ params }: PageProps<'/lab/tools/[slug]'>) {
  const { slug } = await params
  const ctx = await getDetailContext('TOOL', slug)
  const detail = await getToolDetail(ctx.meta.id)
  if (!detail) notFound()
  const { meta, related } = ctx
  const website = safeExternalUrl(detail.websiteUrl)
  const verified = detail.verificationStatus === 'VERIFIED'

  return (
    <article className="grid gap-8">
      <DetailHeader
        ctx={ctx}
        type="TOOL"
        badges={
          <>
            <Badge>{PRICING_LABELS[detail.pricingStatus]}</Badge>
            {detail.supportedMedia.map((m) => (
              <Badge key={m} variant="mono">
                {MEDIA_LABELS[m]}
              </Badge>
            ))}
          </>
        }
      >
        {website && meta.status === 'PUBLISHED' && (
          <Button asChild variant="primary">
            <a href={`/lab/tools/${meta.slug}/visit`} target="_blank" rel="noopener noreferrer">
              Site oficial <ExternalLink />
            </a>
          </Button>
        )}
      </DetailHeader>

      {ctx.locked ? (
        <LockedNotice />
      ) : (
        <>
          <div
            role="note"
            className={cn(
              'flex flex-col gap-2 rounded-2xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between',
              verified ? 'border-success/25 bg-success/[0.06]' : detail.verificationStatus === 'OUTDATED' ? 'border-danger/25 bg-danger/[0.06]' : 'border-warning/25 bg-warning/[0.06]',
            )}
          >
            <p className="flex items-center gap-2">
              {verified ? <ShieldCheck className="size-4 text-success" aria-hidden /> : <ShieldAlert className="size-4 text-warning" aria-hidden />}
              <span className="font-medium">{VERIFICATION_LABELS[detail.verificationStatus]}</span>
              <span className="text-mute">
                {detail.verifiedAt ? `· verificada em ${formatDate(detail.verifiedAt)}` : '· ainda sem data de verificação'}
              </span>
            </p>
            <p className="text-mute">Preços e recursos mudam. Confirme no site oficial antes de assinar.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DetailSection title="Para que serve" className="lg:col-span-2">
              {detail.primaryUse && <p className="text-[15px] font-medium">{detail.primaryUse}</p>}
              {meta.description && <p className="mt-2 text-sm leading-relaxed text-mute">{meta.description}</p>}
              {detail.capabilities.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {detail.capabilities.map((c) => (
                    <Badge key={c} variant="electric">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </DetailSection>
            <DetailSection title="Preço">
              <p className="text-[15px] font-medium">{PRICING_LABELS[detail.pricingStatus]}</p>
              <p className="mt-2 text-sm leading-relaxed text-mute">{detail.pricingNote ?? 'Consulte o site oficial para valores atuais.'}</p>
            </DetailSection>
            <DetailSection title="Pontos fortes">
              <BulletList items={detail.strengths} tone="gold" />
            </DetailSection>
            <DetailSection title="Limitações">
              <BulletList items={detail.limitations} tone="warn" />
            </DetailSection>
            <DetailSection title="Aprenda">
              <RelatedGroup title="Tutoriais" items={related.tutorials} empty="Nenhum tutorial ainda." />
            </DetailSection>
          </div>

          <section aria-labelledby="usage-title" className="grid gap-5 rounded-2xl border border-border p-5 md:p-6">
            <div>
              <h2 id="usage-title" className="text-lg font-semibold">
                Onde {meta.title} entra no Lab
              </h2>
              <p className="text-sm text-mute">Prompts e workflows que usam esta ferramenta.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <RelatedGroup title="Prompts" items={related.prompts} empty="Nenhum prompt ainda." />
              <RelatedGroup title="Workflows" items={related.workflows} empty="Nenhum workflow ainda." />
              <RelatedGroup title="Referências" items={related.references} empty="—" />
            </div>
          </section>
        </>
      )}
    </article>
  )
}
