import { ArrowLeft, FolderOpen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContentCard, ContentGrid } from '@/components/lab/content-card'
import { EmptyState } from '@/components/lab/page-header'
import { Button } from '@/components/ui/button'
import { CollectionActions, RemoveFromCollection } from '@/features/my-lab-forms'
import { relativeTime } from '@/lib/utils'
import { ENTITLEMENTS } from '@/server/access/entitlements'
import { requireMember, viewerHas } from '@/server/auth/viewer'
import { getCollection } from '@/server/queries/user-space'

export const metadata: Metadata = { title: 'Coleção' }

export default async function CollectionPage({ params }: PageProps<'/lab/my-lab/collections/[id]'>) {
  const viewer = await requireMember()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id) || !viewerHas(viewer, ENTITLEMENTS.COLLECTIONS)) notFound()
  // Escopo por dono: coleção de outro usuário responde 404.
  const collection = await getCollection(viewer.id, id)
  if (!collection) notFound()
  const empty = collection.cards.length === 0 && collection.prompts.length === 0

  return (
    <div className="grid gap-8">
      <header className="grid gap-4">
        <Link href="/lab/my-lab?tab=collections" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-bone">
          <ArrowLeft className="size-4" aria-hidden /> Coleções
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Coleção privada</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{collection.name}</h1>
            {collection.description && <p className="mt-2 max-w-2xl text-mute">{collection.description}</p>}
          </div>
          <CollectionActions id={collection.id} name={collection.name} description={collection.description} />
        </div>
      </header>

      {empty ? (
        <EmptyState
          icon={<FolderOpen className="size-5" />}
          title="Coleção vazia"
          description="Use “Salvar em coleção” nas páginas de prompts, workflows, ferramentas, referências e tutoriais."
          action={
            <Button asChild variant="secondary">
              <Link href="/lab/explore">Explorar o Lab</Link>
            </Button>
          }
        />
      ) : (
        <>
          {collection.prompts.length > 0 && (
            <section className="grid gap-3">
              <h2 className="text-sm font-medium text-mute">Meus prompts</h2>
              <ul className="grid gap-3 lg:grid-cols-2">
                {collection.prompts.map((p) => (
                  <li key={p.id} className="lab-card relative flex flex-col gap-2 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/lab/my-lab/prompts/${p.id}`} className="font-medium after:absolute after:inset-0">
                        {p.title}
                      </Link>
                      <RemoveFromCollection collectionId={collection.id} userPromptId={p.id} />
                    </div>
                    <p className="line-clamp-2 font-mono text-xs text-mute">{p.body}</p>
                    <p className="text-xs text-mute-600">{relativeTime(p.updatedAt)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {collection.cards.length > 0 && (
            <ContentGrid>
              {collection.cards.map((card) => (
                <div key={card.id} className="grid gap-1">
                  <ContentCard card={card} showType />
                  <div className="flex justify-end">
                    <RemoveFromCollection collectionId={collection.id} contentId={card.id} />
                  </div>
                </div>
              ))}
            </ContentGrid>
          )}
        </>
      )}
    </div>
  )
}
