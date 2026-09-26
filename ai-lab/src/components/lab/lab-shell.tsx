'use client'
import { Compass, Home, LayoutGrid, Menu, Search, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { SignOutButton } from '@/features/auth-forms'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog'
import { Kbd } from '../ui/misc'
import { CommandPalette, useCommandPalette } from './command-palette'
import { LabLogo } from './logo'
import { PRIMARY_NAV, STUDIO_NAV, isActive, type NavItem } from './nav-config'

type ShellViewer = { name: string; email: string; isAdmin: boolean }

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, item)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-200',
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

function NavSections({ pathname, viewer, onNavigate }: { pathname: string; viewer: ShellViewer; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegação do Lab" className="grid gap-6">
      <div className="grid gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="grid gap-0.5">
        <p className="eyebrow px-3 pb-2 !text-[10px]">Estúdio</p>
        {STUDIO_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
      {viewer.isAdmin && (
        <div className="grid gap-0.5">
          <p className="eyebrow px-3 pb-2 !text-[10px]">INTELRA</p>
          <NavLink item={{ href: '/admin', label: 'Command Center', icon: ShieldCheck }} pathname={pathname} onNavigate={onNavigate} />
        </div>
      )}
    </nav>
  )
}

function UserBlock({ viewer }: { viewer: ShellViewer }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-ink-900/60 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-200 to-gold-600 text-sm font-semibold text-ink-950">
        {viewer.name.trim().charAt(0).toUpperCase() || '?'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{viewer.name}</p>
        <p className="truncate text-xs text-mute-600">{viewer.email}</p>
      </div>
      <SignOutButton className="!px-2" />
    </div>
  )
}

export function LabShell({ viewer, children }: { viewer: ShellViewer; children: React.ReactNode }) {
  const pathname = usePathname()
  const palette = useCommandPalette()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-ink-950/80 px-4 py-5 lg:flex">
        <Link href="/lab" className="px-2" aria-label="INTELRA AI LAB — Home">
          <LabLogo />
        </Link>
        <button
          type="button"
          onClick={() => palette.setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl border border-border bg-ink-900 px-3 text-sm text-mute transition-colors hover:border-bone/20 hover:text-bone"
        >
          <Search className="size-4" aria-hidden />
          Buscar no Lab
          <span className="ml-auto flex gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <div className="-mx-1 flex-1 overflow-y-auto px-1 scrollbar-none">
          <NavSections pathname={pathname} viewer={viewer} />
        </div>
        <UserBlock viewer={viewer} />
      </aside>

      {/* Topo mobile/tablet */}
      <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
        <Link href="/lab" aria-label="INTELRA AI LAB — Home">
          <LabLogo />
        </Link>
        <button
          type="button"
          onClick={() => palette.setOpen(true)}
          className="grid size-10 place-items-center rounded-full text-mute hover:bg-bone/5 hover:text-bone"
          aria-label="Buscar no Lab"
        >
          <Search className="size-5" />
        </button>
      </header>

      <div className="min-w-0">
        <main id="conteudo" className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>

      {/* Navegação inferior mobile */}
      <nav
        aria-label="Navegação principal"
        className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {[
          { href: '/lab', label: 'Home', icon: Home, exact: true },
          { href: '/lab/explore', label: 'Explorar', icon: Compass },
        ].map((item) => (
          <BottomLink key={item.href} item={item} pathname={pathname} />
        ))}
        <button
          type="button"
          onClick={() => palette.setOpen(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-mute"
        >
          <span className="grid size-9 -mt-1 place-items-center rounded-full bg-gold-300 text-ink-950 shadow-[0_6px_20px_-6px_rgb(247_201_72/0.7)]">
            <Search className="size-[18px]" aria-hidden />
          </span>
          <span className="sr-only">Buscar</span>
        </button>
        <BottomLink item={{ href: '/lab/my-lab', label: 'Meu Lab', icon: LayoutGrid }} pathname={pathname} />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-mute"
          aria-haspopup="dialog"
        >
          <Menu className="size-5" aria-hidden />
          Menu
        </button>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent side="left" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <div className="flex h-full flex-col gap-6">
            <LabLogo />
            <div className="flex-1">
              <NavSections pathname={pathname} viewer={viewer} onNavigate={() => setMenuOpen(false)} />
            </div>
            <UserBlock viewer={viewer} />
          </div>
        </DialogContent>
      </Dialog>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  )
}

function BottomLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px]', active ? 'text-gold-200' : 'text-mute')}
    >
      <Icon className="size-5" aria-hidden />
      {item.label}
    </Link>
  )
}

