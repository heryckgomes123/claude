import { Lock } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState, HowTo, PageHeader } from '@/components/lab/page-header'
import { PromptBuilderLoader } from '@/features/prompt-builder-loader'
import { BUILDER_FORMATS, type BuilderFormat, type BuilderState } from '@/lib/prompt-builder'
import { ENTITLEMENTS } from '@/server/access/entitlements'
import { requireMember, viewerHas } from '@/server/auth/viewer'
import { getUserPrompt } from '@/server/queries/user-space'

export const metadata: Metadata = { title: 'Prompt Builder' }

export default async function PromptBuilderPage({ searchParams }: PageProps<'/lab/prompt-builder'>) {
  const viewer = await requireMember()
  const { id } = await searchParams
  const header = (
    <div>
      <PageHeader
        eyebrow="Estúdio"
        title="Prompt Builder"
        description="Monte prompts como um diretor de fotografia: um campo por decisão criativa. O resultado é montado na hora, pronto para copiar ou salvar."
      />
      <HowTo steps={['Descreva o assunto', 'Defina luz, câmera e estilo', 'Copie ou salve no Meu Lab']} />
    </div>
  )

  if (!viewerHas(viewer, ENTITLEMENTS.PROMPT_BUILDER))
    return (
      <div className="grid gap-8">
        {header}
        <EmptyState icon={<Lock className="size-5" />} title="O Prompt Builder não faz parte do seu plano" />
      </div>
    )

  let initial: { id: string; title: string; state: BuilderState; isFavorite: boolean } | undefined
  const promptId = typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id) ? id : null
  if (promptId) {
    const saved = await getUserPrompt(viewer.id, promptId)
    if (saved?.builderState) {
      const format = saved.builderState.format
      initial = {
        id: saved.id,
        title: saved.title,
        isFavorite: saved.isFavorite,
        state: {
          ...saved.builderState,
          format: (BUILDER_FORMATS as readonly string[]).includes(format ?? '') ? (format as BuilderFormat) : 'descriptive',
        },
      }
    }
  }

  return (
    <div className="grid gap-8">
      {header}
      <PromptBuilderLoader key={initial?.id ?? 'new'} initial={initial} />
    </div>
  )
}
