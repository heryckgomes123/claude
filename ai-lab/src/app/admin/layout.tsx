import { AppShell } from '@/components/lab/app-shell'
import { AdminTabs } from '@/features/admin/admin-tabs'
import { requireAdmin } from '@/server/auth/viewer'

/** Painel do professor: 404 para quem não é admin. Cada página e action também valida. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAdmin()
  return (
    <AppShell viewer={{ name: viewer.name, isAdmin: true }}>
      <div className="grid gap-8">
        <div className="grid gap-4">
          <p className="eyebrow">Painel do professor</p>
          <AdminTabs />
        </div>
        {children}
      </div>
    </AppShell>
  )
}
