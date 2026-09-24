import { Lock } from 'lucide-react'
import { Header } from '@/components/ui/Header'
import { IntegrationNotice } from '@/components/ui/States'
import { AuthService } from '@/services/auth/AuthService'
import { ADMIN_MODULES } from './modules'

/**
 * /admin — ESTRUTURA PREPARADA.
 * Sem autenticação real, o painel permanece bloqueado. Não há bypass no cliente:
 * a proteção definitiva deve ocorrer no servidor (cada endpoint valida o papel).
 */
export default function Admin() {
  const authReady = AuthService.available
  return (
    <div className="mx-auto max-w-3xl">
      <Header title="Admin" subtitle="Painel LIFT" back="/perfil" />
      <div className="space-y-5 px-4">
        <div className="card-surface flex items-start gap-4 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warn/12 text-warn">
            <Lock size={20} />
          </span>
          <div>
            <p className="font-display-wide font-bold uppercase">Acesso restrito</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
              {authReady
                ? 'Entre com uma conta com papel de administrador.'
                : 'O painel administrativo exige autenticação real com papel de administrador, validada pelo servidor. Esta integração ainda não existe — por isso nenhum dado ou ação administrativa está disponível.'}
            </p>
          </div>
        </div>
        <div>
          <p className="hud-label mb-2.5">Módulos planejados</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ADMIN_MODULES.map((m) => (
              <div key={m.id} className="rounded-2xl border border-line bg-surface p-3.5 opacity-70">
                <p className="text-[13.5px] font-semibold">{m.label}</p>
                <p className="mt-1 truncate text-[11px] text-muted">{m.tables.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
        <IntegrationNotice>Veja docs/ARCHITECTURE.md para o plano de integração (auth, API, banco e permissões).</IntegrationNotice>
      </div>
    </div>
  )
}
