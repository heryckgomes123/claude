import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/admin-nav'
import { LabLogo } from '@/components/lab/logo'
import { requirePermission } from '@/server/auth/viewer'

export const metadata: Metadata = { title: { default: 'Command Center', template: '%s · Command Center' } }

/** Área administrativa. Quem não tem permissão recebe 404 (a área não é revelada). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePermission('admin:access')
  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <LabLogo />
              <span className="hidden font-mono text-[10px] tracking-[0.2em] text-electric sm:inline">COMMAND CENTER</span>
            </Link>
            <span className="truncate text-xs text-mute-600">{viewer.email}</span>
          </div>
          <AdminNav />
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
        {children}
      </main>
    </div>
  )
}
