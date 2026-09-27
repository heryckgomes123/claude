import { ExternalLink, Wrench } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState, PageHeader } from '@/components/lab/page-header'
import { safeExternalUrl } from '@/lib/utils'
import { requireMember } from '@/server/auth/viewer'
import { groupByModule, listTools } from '@/server/queries'

export const metadata: Metadata = { title: 'Ferramentas' }

export default async function ToolsPage() {
  await requireMember()
  const tools = await listTools()
  const groups = groupByModule(tools.map((t) => ({ ...t, module: t.category })))

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Kit de IA" title="Ferramentas" description="As ferramentas que usamos no método — para que serve cada uma e como usar." />
      {groups.length === 0 ? (
        <EmptyState icon={<Wrench className="size-5" />} title="Nenhuma ferramenta publicada ainda" />
      ) : (
        groups.map((group) => (
          <section key={group.module} aria-labelledby={`t-${group.module}`}>
            <h2 id={`t-${group.module}`} className="mb-3 text-lg font-semibold tracking-tight">
              {group.module}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {group.items.map((t) => {
                const url = safeExternalUrl(t.url)
                return (
                  <li key={t.id} className="lab-card flex flex-col gap-3 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-200/20 to-gold-600/10 font-display text-lg text-gold-200">
                        {t.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-medium">{t.name}</h3>
                        {t.description && <p className="mt-1 text-sm leading-relaxed text-mute">{t.description}</p>}
                      </div>
                    </div>
                    {t.howTo && (
                      <p className="rounded-xl bg-bone/[0.03] px-3.5 py-2.5 text-[13px] leading-relaxed text-bone/80">
                        <span className="font-medium text-gold-200">Como usar: </span>
                        {t.howTo}
                      </p>
                    )}
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex items-center gap-1.5 self-start text-sm text-gold-300 underline decoration-gold-300/40 underline-offset-4 hover:decoration-gold-300"
                      >
                        Abrir {t.name} <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">(abre em nova aba)</span>
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
