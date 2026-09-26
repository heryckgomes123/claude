import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { DisableCodeButton, GenerateCodesForm } from '@/features/admin/admin-forms'
import { formatDate } from '@/lib/utils'
import { requirePermission } from '@/server/auth/viewer'
import { listAccessCodes, listPlans } from '@/server/queries/admin'

export const metadata: Metadata = { title: 'Códigos de acesso' }

export default async function AccessCodesPage() {
  await requirePermission('codes:manage')
  const [codes, plans] = await Promise.all([listAccessCodes(), listPlans()])
  const now = new Date()
  return (
    <div className="grid gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Códigos de acesso</h1>
        <p className="mt-1 max-w-3xl text-sm text-mute">
          A venda acontece fora do Lab. Gere códigos e entregue ao comprador (e-mail pós-compra, área do produto na plataforma de
          pagamento). O comprador cria a conta e resgata o código em <span className="font-mono">/criar-conta</span> ou{' '}
          <span className="font-mono">/acesso</span>. Guardamos apenas o hash de cada código.
        </p>
      </header>
      <GenerateCodesForm plans={plans.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))} />
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-ink-900 text-left text-xs text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Usos</th>
              <th className="px-4 py-3 font-medium">Acesso</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Nota</th>
              <th className="px-4 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const expired = c.expiresAt && c.expiresAt < now
              const exhausted = c.redemptionCount >= c.maxRedemptions
              const status = c.disabledAt ? 'Desativado' : expired ? 'Expirado' : exhausted ? 'Esgotado' : 'Disponível'
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">{c.codeHint}</td>
                  <td className="px-4 py-3">{c.planName}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.redemptionCount}/{c.maxRedemptions}
                  </td>
                  <td className="px-4 py-3 text-xs text-mute">{c.durationDays ? `${c.durationDays} dias` : 'Sem término'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={status === 'Disponível' ? 'success' : 'default'}>{status}</Badge>
                    {c.expiresAt && <span className="ml-2 text-xs text-mute-600">até {formatDate(c.expiresAt)}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-mute">{c.note ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{status === 'Disponível' && <DisableCodeButton id={c.id} />}</td>
                </tr>
              )
            })}
            {codes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-mute">
                  Nenhum código gerado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
