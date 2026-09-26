import { Clock, Copy, FolderOpen, Heart, Sparkles, Wand2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentCard, ContentGrid } from '@/components/lab/content-card'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { Button } from '@/components/ui/button'
import { NewCollectionButton } from '@/features/my-lab-forms'
import { CONTENT_TYPE_META, CONTENT_TYPES, type ContentType } from '@/lib/labels'
import { cn, relativeTime } from '@/lib/utils'
import { ENTITLEMENTS } from '@/server/access/entitlements'
import { requireMember, viewerHas } from '@/server/auth/viewer'
import {
  getFavoriteCards,
  getFavoriteCounts,
  getRecentByAction,
  listCollections,
  listUserPrompts,
} from '@/server/queries/user-space'

export const metadata: Metadata = { title: 'Meu Lab' }

const TABS = [
  { key: 'favorites', label: 'Favoritos', icon: Heart },
  { key: 'collections', label: 'Coleções', icon: FolderOpen },
  { key: 'prompts', label: 'Meus prompts', icon: Sparkles },
  { key: 'recent', label: 'Vistos recentemente', icon: Clock },
  { key: 'used', label: 'Usados recentemente', icon: Copy },
] as const
type Tab = (typeof TABS)[number]['key']

const FAVORITE_LABELS: Record<ContentType, string> = {
  PROMPT: 'Prompts',
  WORKFLOW: 'Meus workflows',
  TOOL: 'Ferramentas',
  REFERENCE: 'Minhas referências',
  TUTORIAL: 'Tutoriais',
}

export default async function MyLabPage({ searchParams }: PageProps<'/lab/my-lab'>) {
  const viewer = await requireMember()
  const raw = await searchParams
  const tabParam = typeof raw.tab === 'string' ? raw.tab : ''
  const tab: Tab = (TABS.map((t) => t.key) as string[]).includes(tabParam) ? (tabParam as Tab) : 'favorites'
  const typeParam = typeof raw.type === 'string' ? raw.type : ''
  const favType = (CONTENT_TYPES as readonly string[]).includes(typeParam) ? (typeParam as ContentType) : undefined
  const canCollections = viewerHas(viewer, ENTITLEMENTS.COLLECTIONS)

  const counts = await getFavoriteCounts(viewer.id)
  const totalFavorites = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Seu espaço"
        title="Meu Lab"
        description="Tudo o que você salvou, organizou e criou. Seus prompts e coleções são privados."
      >
        <Button asChild variant="outline">
          <Link href="/lab/prompt-builder">
            <Wand2 /> Novo prompt
          </Link>
        </Button>
      </PageHeader>

      <nav aria-label="Seções do Meu Lab" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 scrollbar-none sm:mx-0 sm:px-0">
        {TABS.filter((t) => t.key !== 'collections' || canCollections).map((t) => (
          <Link
            key={t.key}
            href={`/lab/my-lab?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors',
              tab === t.key ? 'border-gold-300 text-bone' : 'border-transparent text-mute hover:text-bone',
            )}
          >
            <t.icon className="size-4" aria-hidden /> {t.label}
            {t.key === 'favorites' && totalFavorites > 0 && <span className="font-mono text-xs text-mute-600">{totalFavorites}</span>}
          </Link>
        ))}
      </nav>

      {tab === 'favorites' && (
        <section className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            <Chip href="/lab/my-lab?tab=favorites" active={!favType} label={`Tudo (${totalFavorites})`} />
            {CONTENT_TYPES.map((t) => (
              <Chip key={t} href={`/lab/my-lab?tab=favorites&type=${t}`} active={favType === t} label={`${FAVORITE_LABELS[t]} (${counts[t] ?? 0})`} />
            ))}
          </div>
          <FavoritesGrid userId={viewer.id} type={favType} />
        </section>
      )}

      {tab === 'collections' && canCollections && <CollectionsTab userId={viewer.id} />}
      {tab === 'prompts' && <PromptsTab userId={viewer.id} />}
      {tab === 'recent' && <HistoryTab userId={viewer.id} actions={['VIEW']} empty="Os conteúdos que você abrir aparecem aqui." />}
      {tab === 'used' && (
        <HistoryTab userId={viewer.id} actions={['COPY', 'VISIT']} empty="Prompts copiados e ferramentas acessadas aparecem aqui." />
      )}
    </div>
  )
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-[13px] transition-colors',
        active ? 'border-gold-300/40 bg-gold-300/10 text-gold-100' : 'border-border text-mute hover:text-bone',
      )}
    >
      {label}
    </Link>
  )
}

async function FavoritesGrid({ userId, type }: { userId: string; type?: ContentType }) {
  const cards = await getFavoriteCards(userId, type)
  if (!cards.length)
    return (
      <EmptyState
        icon={<Heart className="size-5" />}
        title={type ? `Nenhum item em ${FAVORITE_LABELS[type].toLowerCase()}` : 'Você ainda não favoritou nada'}
        description="Toque no coração de qualquer prompt, workflow, ferramenta, referência ou tutorial para guardar aqui."
        action={
          <Button asChild variant="secondary">
            <Link href={type ? CONTENT_TYPE_META[type].path : '/lab/explore'}>Explorar</Link>
          </Button>
        }
      />
    )
  return (
    <ContentGrid>
      {cards.map((card) => (
        <ContentCard key={card.id} card={card} showType />
      ))}
    </ContentGrid>
  )
}

async function CollectionsTab({ userId }: { userId: string }) {
  const collections = await listCollections(userId)
  return (
    <section className="grid gap-5">
      <div className="flex justify-end">
        <NewCollectionButton />
      </div>
      {collections.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((c) => (
            <li key={c.id}>
              <Link href={`/lab/my-lab/collections/${c.id}`} className="lab-card flex h-full flex-col gap-3 rounded-2xl p-5">
                <FolderOpen className="size-5 text-gold-300" aria-hidden />
                <span>
                  <span className="block font-medium">{c.name}</span>
                  {c.description && <span className="mt-1 line-clamp-2 block text-sm text-mute">{c.description}</span>}
                </span>
                <span className="mt-auto text-xs text-mute-600">
                  {c.itemCount} {c.itemCount === 1 ? 'item' : 'itens'} · atualizada {relativeTime(c.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<FolderOpen className="size-5" />}
          title="Crie sua primeira coleção"
          description="Agrupe conteúdos por cliente, projeto ou formato — ex.: “Publicidade”, “Fotografia IA”, “Intelra Content”."
        />
      )}
    </section>
  )
}

async function PromptsTab({ userId }: { userId: string }) {
  const prompts = await listUserPrompts(userId)
  if (!prompts.length)
    return (
      <EmptyState
        icon={<Sparkles className="size-5" />}
        title="Nenhum prompt próprio ainda"
        description="Crie no Prompt Builder, ou use Remix/Duplicar em qualquer prompt da biblioteca para ter sua versão editável."
        action={
          <Button asChild variant="primary">
            <Link href="/lab/prompt-builder">
              <Wand2 /> Abrir o Prompt Builder
            </Link>
          </Button>
        }
      />
    )
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {prompts.map((p) => (
        <li key={p.id}>
          <Link href={`/lab/my-lab/prompts/${p.id}`} className="lab-card flex h-full flex-col gap-3 rounded-2xl p-5">
            <span className="flex items-center gap-2">
              {p.isFavorite && <Heart className="size-4 fill-gold-300 text-gold-300" aria-label="Favorito" />}
              <span className="truncate font-medium">{p.title}</span>
            </span>
            <span className="line-clamp-3 font-mono text-xs leading-5 text-mute">{p.body}</span>
            <span className="mt-auto text-xs text-mute-600">
              {p.fromBuilder ? 'Prompt Builder' : p.sourceTitle ? `Baseado em ${p.sourceTitle}` : 'Prompt próprio'} · {relativeTime(p.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

async function HistoryTab({ userId, actions, empty }: { userId: string; actions: ('VIEW' | 'COPY' | 'VISIT')[]; empty: string }) {
  const cards = await getRecentByAction(userId, actions, 24)
  if (!cards.length) return <EmptyState icon={<Clock className="size-5" />} title="Nada por aqui ainda" description={empty} />
  return (
    <ContentGrid>
      {cards.map((card) => (
        <ContentCard key={card.id} card={card} showType />
      ))}
    </ContentGrid>
  )
}
