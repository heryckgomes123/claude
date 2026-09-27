import { CheckCircle2, Circle, Copy, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/lab/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/utils'
import { adminOverview } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'
import { emailEnabled, webhookEnv } from '@/server/env'
import { getSettings } from '@/server/settings'
import { OUTCOME_LABELS, OutcomeBadge } from './vendas/outcome'

export const metadata: Metadata = { title: 'Painel do professor' }

export default async function AdminHome() {
  await requireAdmin()
  const [data, settings] = await Promise.all([adminOverview(), getSettings()])
  const hooks = webhookEnv()
  const checklist = [
    { done: data.prompts > 0, label: 'Publicar os primeiros prompts', href: '/admin/prompts/novo' },
    { done: data.lessons > 0, label: 'Publicar as aulas', href: '/admin/aulas/novo' },
    { done: Boolean(settings.checkoutUrl), label: 'Colocar o link de compra (checkout)', href: '/admin/vendas' },
    {
      done: Boolean(hooks.hotmartHottok || hooks.kiwifyToken),
      label: 'Conectar a Hotmart ou a Kiwify (liberação automática)',
      href: '/admin/vendas',
    },
    { done: emailEnabled(), label: 'Configurar e-mails (confirmação de e-mail e nova senha)', href: '/admin/vendas#email' },
  ]

  return (
    <div className="grid gap-8">
      <PageHeader title="Visão geral" description="Tudo o que seus alunos veem é cadastrado aqui.">
        <Button asChild variant="primary">
          <Link href="/admin/prompts/novo">
            <Plus /> Novo prompt
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin/aulas/novo">
            <Plus /> Nova aula
          </Link>
        </Button>
      </PageHeader>

      <ul aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Alunos com acesso', value: data.activeStudents, href: '/admin/alunos' },
          { label: 'Vendas (30 dias)', value: data.salesLast30, href: '/admin/vendas' },
          { label: 'Prompts', value: data.prompts, href: '/admin/prompts' },
          { label: 'Aulas', value: data.lessons, href: '/admin/aulas' },
          { label: 'Ferramentas', value: data.tools, href: '/admin/ferramentas' },
        ].map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="lab-card block rounded-2xl p-4">
              <span className="block text-xs text-mute">{s.label}</span>
              <span className="mt-1 block font-display text-3xl text-bone">{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="checklist">
          <h2 id="checklist" className="eyebrow">
            Primeiros passos
          </h2>
          <ul className="mt-3 grid gap-1">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-bone/[0.04]">
                  {item.done ? (
                    <CheckCircle2 className="size-[18px] shrink-0 text-success" aria-label="Feito" />
                  ) : (
                    <Circle className="size-[18px] shrink-0 text-mute-600" aria-label="Pendente" />
                  )}
                  <span className={item.done ? 'text-mute line-through decoration-mute-600' : ''}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="top">
          <h2 id="top" className="eyebrow flex items-center gap-2">
            <Copy className="size-3.5" aria-hidden /> Prompts mais copiados
          </h2>
          {data.topPrompts.length ? (
            <ol className="mt-3 grid gap-2 text-sm">
              {data.topPrompts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="w-4 font-mono text-xs text-mute">{i + 1}</span>
                  <Link href={`/admin/prompts/${p.id}`} className="min-w-0 flex-1 truncate hover:text-gold-200">
                    {p.title}
                  </Link>
                  <span className="font-mono text-xs text-mute">{p.copyCount}×</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-mute">Assim que os alunos copiarem prompts, os mais usados aparecem aqui.</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="eventos">
        <div className="flex items-center justify-between gap-3">
          <h2 id="eventos" className="eyebrow">
            Últimas notificações de venda
          </h2>
          <Link href="/admin/vendas" className="text-xs text-gold-300 underline underline-offset-4">
            Ver todas
          </Link>
        </div>
        {data.recentEvents.length ? (
          <ul className="mt-3 grid gap-2 text-sm">
            {data.recentEvents.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <OutcomeBadge outcome={e.outcome} />
                <span className="min-w-0 truncate">{e.email ?? OUTCOME_LABELS[e.outcome] ?? e.eventType}</span>
                <Badge variant="mono">{e.provider}</Badge>
                <span className="ml-auto text-xs text-mute">{relativeTime(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mute">Nenhuma notificação recebida ainda.</p>
        )}
      </section>
    </div>
  )
}
