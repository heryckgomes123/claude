'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin', label: 'Visão geral', exact: true },
  { href: '/admin/prompts', label: 'Prompts' },
  { href: '/admin/aulas', label: 'Aulas' },
  { href: '/admin/ferramentas', label: 'Ferramentas' },
  { href: '/admin/alunos', label: 'Alunos' },
  { href: '/admin/vendas', label: 'Vendas' },
]

export function AdminTabs() {
  const pathname = usePathname()
  return (
    <nav aria-label="Painel do professor" className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-2xl border border-border bg-ink-900/70 p-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block whitespace-nowrap rounded-xl px-3.5 py-2 text-sm transition-colors',
                  active ? 'bg-gold-300 font-medium text-ink-950' : 'text-mute hover:bg-bone/5 hover:text-bone',
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
