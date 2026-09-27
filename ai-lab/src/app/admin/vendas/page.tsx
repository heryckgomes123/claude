import { CheckCircle2, CircleAlert } from 'lucide-react'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/lab/page-header'
import { Badge } from '@/components/ui/badge'
import { Field, Input } from '@/components/ui/input'
import { ActionForm } from '@/features/admin/action-form'
import { CopyField } from '@/features/admin/copy-field'
import { relativeTime } from '@/lib/utils'
import { updateSettings } from '@/server/actions/admin'
import { listWebhookEvents } from '@/server/admin-queries'
import { requireAdmin } from '@/server/auth/viewer'
import { appUrl } from '@/server/email'
import { emailEnabled, webhookEnv } from '@/server/env'
import { getSettings } from '@/server/settings'
import { OutcomeBadge } from './outcome'

export const metadata: Metadata = { title: 'Vendas · Painel' }

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className={`flex items-start gap-2 text-sm ${ok ? 'text-success' : 'text-warning'}`}>
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  )
}

export default async function AdminSalesPage() {
  await requireAdmin()
  const [settings, events] = await Promise.all([getSettings(), listWebhookEvents(50)])
  const hooks = webhookEnv()
  const base = appUrl()

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Vendas e acesso"
        description="Conecte sua plataforma de vendas: quem compra recebe acesso automático; reembolso ou chargeback remove o acesso."
      />

      <section className="grid gap-4 rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="links">
        <h2 id="links" className="font-medium">
          Links da página de vendas
        </h2>
        <ActionForm action={updateSettings} submitLabel="Salvar links">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Link de compra (checkout)" htmlFor="checkoutUrl" optional hint="Aparece no botão “Quero ter acesso” e para quem entra sem compra.">
              <Input id="checkoutUrl" name="checkoutUrl" type="url" defaultValue={settings.checkoutUrl} placeholder="https://pay.hotmart.com/…" />
            </Field>
            <Field label="Link de suporte" htmlFor="supportUrl" optional hint="WhatsApp, e-mail ou central de ajuda.">
              <Input id="supportUrl" name="supportUrl" type="url" defaultValue={settings.supportUrl} placeholder="https://wa.me/55…" />
            </Field>
          </div>
        </ActionForm>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="grid content-start gap-3 rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="hotmart">
          <h2 id="hotmart" className="font-medium">
            Hotmart
          </h2>
          <Status ok={Boolean(hooks.hotmartHottok)}>
            {hooks.hotmartHottok ? 'Conectada (HOTMART_HOTTOK configurado).' : 'Falta configurar a variável HOTMART_HOTTOK na Netlify.'}
          </Status>
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm leading-relaxed text-mute">
            <li>Na Hotmart: Ferramentas → Webhook (API e notificações) → Cadastrar webhook.</li>
            <li>Cole a URL abaixo, versão 2.0.0, e marque compra aprovada, completa, reembolso, chargeback, cancelada e cancelamento de assinatura.</li>
            <li>Copie o “Hottok” e salve na Netlify como <code className="text-gold-200">HOTMART_HOTTOK</code>.</li>
          </ol>
          <CopyField value={`${base}/api/webhooks/hotmart`} label="URL do webhook da Hotmart" />
          {hooks.hotmartProductIds.length > 0 && (
            <p className="text-xs text-mute">Produtos aceitos: {hooks.hotmartProductIds.join(', ')}</p>
          )}
        </section>

        <section className="grid content-start gap-3 rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="kiwify">
          <h2 id="kiwify" className="font-medium">
            Kiwify
          </h2>
          <Status ok={Boolean(hooks.kiwifyToken)}>
            {hooks.kiwifyToken ? 'Conectada (KIWIFY_WEBHOOK_TOKEN configurado).' : 'Falta configurar a variável KIWIFY_WEBHOOK_TOKEN na Netlify.'}
          </Status>
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm leading-relaxed text-mute">
            <li>Na Kiwify: Apps → Webhooks → Criar webhook.</li>
            <li>Cole a URL abaixo e marque compra aprovada, reembolso, chargeback e assinatura cancelada.</li>
            <li>Copie o token do webhook e salve na Netlify como <code className="text-gold-200">KIWIFY_WEBHOOK_TOKEN</code>.</li>
          </ol>
          <CopyField value={`${base}/api/webhooks/kiwify`} label="URL do webhook da Kiwify" />
          {hooks.kiwifyProductIds.length > 0 && <p className="text-xs text-mute">Produtos aceitos: {hooks.kiwifyProductIds.join(', ')}</p>}
        </section>
      </div>

      <section id="email" className="grid gap-3 rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="email-t">
        <h2 id="email-t" className="font-medium">
          E-mails automáticos
        </h2>
        <Status ok={emailEnabled()}>
          {emailEnabled()
            ? 'Ativos: boas-vindas após a compra, confirmação de e-mail no cadastro e “esqueci minha senha”.'
            : 'Desativados. Sem eles, o cadastro não confirma se o e-mail pertence ao aluno e não há “esqueci minha senha”. Configure RESEND_API_KEY e EMAIL_FROM (resend.com) na Netlify.'}
        </Status>
      </section>

      <section className="grid gap-3" aria-labelledby="log">
        <h2 id="log" className="font-medium">
          Notificações recebidas
        </h2>
        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-bone/10 px-5 py-8 text-center text-sm text-mute">
            Nenhuma notificação ainda. Depois de configurar, use o “testar webhook” da plataforma — o resultado aparece aqui.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-ink-900 text-left text-xs text-mute">
                <tr>
                  <th className="px-4 py-3 font-medium">Quando</th>
                  <th className="px-4 py-3 font-medium">Plataforma</th>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Comprador</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-mute">{relativeTime(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="mono">{e.provider}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-mute">{e.eventType}</td>
                    <td className="px-4 py-3">
                      <span className="block">{e.email ?? '—'}</span>
                      {e.product && <span className="block text-xs text-mute-600">{e.product}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <OutcomeBadge outcome={e.outcome} />
                      {e.detail && <span className="mt-1 block text-xs text-mute">{e.detail}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
