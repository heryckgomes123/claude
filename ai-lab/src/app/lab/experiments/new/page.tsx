import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/lab/page-header'
import { ExperimentForm } from '@/features/experiment-form'
import { ENTITLEMENTS } from '@/server/access/entitlements'
import { requireMember, viewerHas } from '@/server/auth/viewer'
import { getContentMeta, listPickable } from '@/server/queries/content'
import { getPromptDetail } from '@/server/queries/details'
import { getUserPrompt } from '@/server/queries/user-space'

export const metadata: Metadata = { title: 'Novo experimento' }

export default async function NewExperimentPage({ searchParams }: PageProps<'/lab/experiments/new'>) {
  const viewer = await requireMember()
  if (!viewerHas(viewer, ENTITLEMENTS.EXPERIMENTS)) notFound()
  const sp = await searchParams
  const pickable = await listPickable(['TOOL', 'PROMPT'])
  const tools = pickable.filter((p) => p.type === 'TOOL')
  const prompts = pickable.filter((p) => p.type === 'PROMPT')

  // Pré-preenchimento a partir de um prompt da biblioteca ou de um prompt próprio.
  let initial: Parameters<typeof ExperimentForm>[0]['initial']
  if (typeof sp.prompt === 'string' && /^[a-z0-9-]{1,96}$/.test(sp.prompt)) {
    const meta = await getContentMeta('PROMPT', sp.prompt)
    const detail = meta ? await getPromptDetail(meta.id) : null
    if (meta && detail)
      initial = {
        title: `Teste — ${meta.title}`,
        objective: '',
        toolId: null,
        sourcePromptId: meta.id,
        notes: null,
        variants: [
          { label: 'A', prompt: detail.body },
          { label: 'B', prompt: detail.body },
        ],
      }
  } else if (typeof sp.userPrompt === 'string' && /^[0-9a-f-]{36}$/i.test(sp.userPrompt)) {
    const own = await getUserPrompt(viewer.id, sp.userPrompt)
    if (own)
      initial = {
        title: `Teste — ${own.title}`.slice(0, 140),
        objective: '',
        toolId: null,
        sourcePromptId: null,
        notes: null,
        variants: [
          { label: 'A', prompt: own.body },
          { label: 'B', prompt: own.body },
        ],
      }
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <Link href="/lab/experiments" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-bone">
          <ArrowLeft className="size-4" aria-hidden /> Experimentos
        </Link>
        <PageHeader title="Novo experimento" description="Mude uma coisa por variante — luz, lente, estilo — para saber exatamente o que fez diferença." />
      </div>
      <ExperimentForm tools={tools} prompts={prompts} initial={initial} />
    </div>
  )
}
