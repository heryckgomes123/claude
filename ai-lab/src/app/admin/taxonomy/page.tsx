import type { Metadata } from 'next'
import { CategoryIcon } from '@/components/lab/content-icons'
import { CategoryDialog, DeleteCategoryButton, TagRow } from '@/features/admin/admin-forms'
import { requirePermission } from '@/server/auth/viewer'
import { listTaxonomy } from '@/server/queries/admin'

export const metadata: Metadata = { title: 'Taxonomia' }

export default async function TaxonomyPage() {
  await requirePermission('taxonomy:write')
  const { categories, tags } = await listTaxonomy()
  const groups = [
    { kind: 'CONTENT' as const, title: 'Categorias de conteúdo', description: 'Usadas em prompts, workflows, referências, tutoriais e no Explorar.' },
    { kind: 'TOOL' as const, title: 'Categorias de ferramentas', description: 'Organizam o diretório de ferramentas.' },
  ]
  return (
    <div className="grid gap-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Taxonomia</h1>
          <p className="mt-1 text-sm text-mute">Categorias e tags alimentam filtros, busca e recomendações.</p>
        </div>
        <CategoryDialog />
      </header>
      {groups.map((g) => (
        <section key={g.kind} aria-labelledby={`cat-${g.kind}`} className="grid gap-3">
          <div>
            <h2 id={`cat-${g.kind}`} className="font-semibold">
              {g.title}
            </h2>
            <p className="text-sm text-mute">{g.description}</p>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {categories
              .filter((c) => c.kind === g.kind)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-ink-900/60 px-4 py-3">
                  <CategoryIcon name={c.icon} className="size-4 text-gold-300" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{c.name}</span>
                    <span className="font-mono text-[11px] text-mute-600">
                      {c.slug} · ordem {c.sortOrder} · {c.usage} itens
                    </span>
                  </span>
                  <CategoryDialog category={c} />
                  <DeleteCategoryButton id={c.id} name={c.name} usage={c.usage} />
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section aria-labelledby="tags-title" className="grid gap-3">
        <div>
          <h2 id="tags-title" className="font-semibold">
            Tags ({tags.length})
          </h2>
          <p className="text-sm text-mute">Tags são criadas automaticamente ao salvar conteúdo. Aqui você renomeia ou remove.</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {tags.map((t) => (
            <TagRow key={t.id} {...t} />
          ))}
        </ul>
      </section>
    </div>
  )
}
