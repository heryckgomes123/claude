import { FlaskConical, Lock, Plus, Trophy } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, HowTo, PageHeader } from '@/components/lab/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/utils'
import { ENTITLEMENTS } from '@/server/access/entitlements'
import { requireMember, viewerHas } from '@/server/auth/viewer'
import { listExperiments } from '@/server/queries/user-space'

export const metadata: Metadata = { title: 'Experimentos' }

export default async function ExperimentsPage() {
  const viewer = await requireMember()
  const allowed = viewerHas(viewer, ENTITLEMENTS.EXPERIMENTS)
  const experiments = allowed ? await listExperiments(viewer.id) : []

  return (
    <div className="grid gap-8">
      <div>
        <PageHeader
          eyebrow="Estúdio"
          title="Experimentos"
          description="Teste variações de um prompt lado a lado e registre o que funcionou. É assim que um bom prompt vira o seu prompt."
        >
          {allowed && (
            <Button asChild variant="primary">
              <Link href="/lab/experiments/new">
                <Plus /> Novo experimento
              </Link>
            </Button>
          )}
        </PageHeader>
        <HowTo steps={['Escolha um objetivo', 'Rode as variantes A, B, C na ferramenta', 'Registre resultado e nota']} />
      </div>
      {!allowed ? (
        <EmptyState icon={<Lock className="size-5" />} title="Experimentos não fazem parte do seu plano" />
      ) : experiments.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="size-5" />}
          title="Nenhum experimento ainda"
          description="Comece por um prompt da biblioteca: abra-o e clique em “Testar num experimento”."
          action={
            <Button asChild variant="primary">
              <Link href="/lab/experiments/new">Criar o primeiro</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {experiments.map((e) => (
            <li key={e.id}>
              <Link href={`/lab/experiments/${e.id}`} className="lab-card flex h-full flex-col gap-3 rounded-2xl p-5">
                <FlaskConical className="size-5 text-gold-300" aria-hidden />
                <span className="font-medium">{e.title}</span>
                {e.objective && <span className="line-clamp-2 text-sm text-mute">{e.objective}</span>}
                <span className="mt-auto flex flex-wrap items-center gap-1.5">
                  <Badge variant="mono">{e.variantCount} variantes</Badge>
                  {e.toolTitle && <Badge>{e.toolTitle}</Badge>}
                  {e.bestScore !== null && (
                    <Badge variant="gold">
                      <Trophy /> {e.bestScore}/10
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-mute-600">{relativeTime(e.updatedAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
