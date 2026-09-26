'use client'
import { ArrowLeft, FileStack, Gauge, KeyRound, Megaphone, Tags, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Visão geral', icon: Gauge, exact: true },
  { href: '/admin/content', label: 'Conteúdo', icon: FileStack },
  { href: '/admin/taxonomy', label: 'Taxonomia', icon: Tags },
  { href: '/admin/members', label: 'Membros', icon: Users },
  { href: '/admin/access-codes', label: 'Códigos de acesso', icon: KeyRound },
  { href: '/admin/updates', label: 'Novidades', icon: Megaphone },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin" className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors',
              active ? 'bg-bone/[0.07] text-bone' : 'text-mute hover:text-bone',
            )}
          >
            <item.icon className={cn('size-4', active ? 'text-gold-300' : '')} aria-hidden />
            {item.label}
          </Link>
        )
      })}
      <Link href="/lab" className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm text-mute hover:text-bone">
        <ArrowLeft className="size-4" aria-hidden /> Voltar ao Lab
      </Link>
    </nav>
  )
}
