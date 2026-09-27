import { Heart } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { PromptGrid } from '@/components/lab/prompt-card'
import { Button } from '@/components/ui/button'
import { requireMember } from '@/server/auth/viewer'
import { listFavorites } from '@/server/queries'

export const metadata: Metadata = { title: 'Favoritos' }

export default async function FavoritesPage() {
  const viewer = await requireMember()
  const favorites = await listFavorites(viewer.id)
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Seu espaço" title="Favoritos" description="Os prompts que você salvou para usar de novo." />
      {favorites.length ? (
        <PromptGrid prompts={favorites} />
      ) : (
        <EmptyState
          icon={<Heart className="size-5" />}
          title="Nenhum favorito ainda"
          description="Toque no coração de um prompt para guardar aqui."
          action={
            <Button asChild variant="secondary">
              <Link href="/lab/prompts">Ver prompts</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
