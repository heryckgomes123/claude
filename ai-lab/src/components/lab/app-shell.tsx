'use client'
import { BookOpen, Heart, Home, type LucideIcon, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@/features/auth-forms'
import { cn } from '@/lib/utils'
import { LabLogo } from './logo'

type NavItem = { href: string; label: string; short?: string; icon: LucideIcon; exact?: boolean }

const NAV: NavItem[] = [
  { href: '/lab', label: 'Início', icon: Home, exact: true },
  { href: '/lab/prompts', label: 'Prompts', icon: Sparkles },
  { href: '/lab/aulas', label: 'Aulas', icon: BookOpen },
  { href: '/lab/ferramentas', label: 'Ferramentas', short: 'Ferram.', icon: Wrench },
  { href: '/lab/favoritos', label: 'Favoritos', icon: Heart },
]
const ADMIN: NavItem = { href: '/admin', label: 'Painel do professor', short: 'Painel', icon: ShieldCheck }

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

type ShellViewer = { name: string; isAdmin: boolean }

export function AppShell({ viewer, children }: { viewer: ShellViewer; children: React.ReactNode }) {
  const pathname = usePathname()
  const bottom = viewer.isAdmin ? [...NAV, ADMIN] : NAV

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-border bg-ink-950/80 px-4 py-6 lg:flex">
        <Link href="/lab" className="px-2" aria-label="INTELRA AI LAB — início">
          <LabLogo />
        </Link>
        <nav aria-label="Menu" className="grid flex-1 content-start gap-0.5">
          {NAV.map((item) => (
            <SideLink key={item.href} item={item} active={isActive(pathname, item)} />
          ))}
          {viewer.isAdmin && (
            <div className="mt-6 grid gap-0.5">
              <p className="eyebrow px-3 pb-2 !text-[10px]">Professor</p>
              <SideLink item={ADMIN} active={isActive(pathname, ADMIN)} />
            </div>
          )}
        </nav>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-ink-900/60 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-200 to-gold-600 text-sm font-semibold text-ink-950">
            {viewer.name.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{viewer.name}</p>
            <p className="text-xs text-mute-600">{viewer.isAdmin ? 'Professor' : 'Aluno'}</p>
          </div>
          <SignOutButton className="!px-2" />
        </div>
      </aside>

      <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
        <Link href="/lab" aria-label="INTELRA AI LAB — início">
          <LabLogo />
        </Link>
        <SignOutButton />
      </header>

      <div className="min-w-0">
        <main id="conteudo" className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>

      <nav
        aria-label="Menu principal"
        className="glass fixed inset-x-0 bottom-0 z-40 grid border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${bottom.length}, minmax(0, 1fr))` }}
      >
        {bottom.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px]', active ? 'text-gold-200' : 'text-mute')}
            >
              <Icon className="size-5" aria-hidden />
              {item.short ?? item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200',
        active ? 'bg-bone/[0.06] text-bone' : 'text-mute hover:bg-bone/[0.03] hover:text-bone',
      )}
    >
      <Icon
        className={cn('size-[18px] transition-colors', active ? 'text-gold-300' : 'text-mute-600 group-hover:text-bone/80')}
        aria-hidden
      />
      {item.label}
      {active && <span className="ml-auto size-1.5 rounded-full bg-gold-300 shadow-[0_0_8px_rgb(247_201_72/0.8)]" />}
    </Link>
  )
}
