import { ArrowLeft, ArrowUpRight, FlaskConical, Wand2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SaveToCollection } from '@/components/lab/save-to-collection'
import { Button } from '@/components/ui/button'
import { UserPromptEditor } from '@/features/my-lab-forms'
import { contentHref } from '@/lib/labels'
import { relativeTime } from '@/lib/utils'
import { ENTITLEMENTS } from '@/server/access/entitlements'
import { requireMember, viewerHas } from '@/server/auth/viewer'
import { getMembershipInCollections, getUserPrompt, listCollections } from '@/server/queries/user-space'

export const metadata: Metadata = { title: 'Meu prompt' }

export default async function UserPromptPage({ params }: PageProps<'/lab/my-lab/prompts/[id]'>) {
  const viewer = await requireMember()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  // Escopo por dono: prompt de outro usuário responde 404.
  const prompt = await getUserPrompt(viewer.id, id)
  if (!prompt) notFound()
  const canCollections = viewerHas(viewer, ENTITLEMENTS.COLLECTIONS)
  const [collections, included] = canCollections
    ? await Promise.all([listCollections(viewer.id), getMembershipInCollections(viewer.id, { userPromptId: prompt.id })])
    : [[], []]

  return (
    <div className="grid max-w-4xl gap-8">
      <header className="grid gap-4">
        <Link href="/lab/my-lab?tab=prompts" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-bone">
          <ArrowLeft className="size-4" aria-hidden /> Meus prompts
        </Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Prompt privado · editado {relativeTime(prompt.updatedAt)}</p>
            {prompt.source && (
              <Link href={contentHref('PROMPT', prompt.source.slug)} className="mt-2 inline-flex items-center gap-1 text-sm text-gold-300 hover:underline">
                Baseado em {prompt.source.title} <ArrowUpRight className="size-3.5" />
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {prompt.builderState && (
              <Button asChild variant="secondary">
                <Link href={`/lab/prompt-builder?id=${prompt.id}`}>
                  <Wand2 /> Abrir no Builder
                </Link>
              </Button>
            )}
            {canCollections && (
              <SaveToCollection
                target={{ userPromptId: prompt.id }}
                collections={collections.map((c) => ({ id: c.id, name: c.name, included: included.includes(c.id) }))}
              />
            )}
            <Button asChild variant="ghost">
              <Link href={`/lab/experiments/new?userPrompt=${prompt.id}`}>
                <FlaskConical /> Testar
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <UserPromptEditor prompt={prompt} />
    </div>
  )
}
