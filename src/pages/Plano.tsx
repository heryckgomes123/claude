import { CheckCircle2, CreditCard, MessageCircle } from 'lucide-react'
import { liftApi } from '@/services/api/liftApi'
import { useResource } from '@/hooks/useResource'
import { Header } from '@/components/ui/Header'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Badge, DemoTag } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IntegrationNotice, LoadingState } from '@/components/ui/States'
import { LIFT_CONFIG } from '@/config/lift.config'
import { daysBetween, fmtFullDate } from '@/lib/dates'

const STATUS = { active: { l: 'Ativo', t: 'ok' as const }, pending: { l: 'Pendente', t: 'warn' as const }, expired: { l: 'Vencido', t: 'danger' as const }, cancelled: { l: 'Cancelado', t: 'neutral' as const } }

export default function Plano() {
  const plans = useResource(() => liftApi.listPlans())
  const sub = useResource(() => liftApi.getSubscription())
  const plan = plans.data?.find((p) => p.id === sub.data?.planId)

  return (
    <div>
      <Header title="Meu plano" subtitle="Assinatura" back action={<DemoTag />} />
      <div className="space-y-7 px-4">
        {(plans.loading || sub.loading) && <LoadingState rows={2} />}
        {plan && sub.data && (
          <>
            <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-lift/30 bg-gradient-to-br from-[#10244f] to-surface p-5">
              <div className="hud-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="hud-label !text-lift-3">{LIFT_CONFIG.LIFT_NAME}</p>
                  <Badge tone={STATUS[sub.data.status].t}>{STATUS[sub.data.status].l}</Badge>
                </div>
                <h2 className="font-display-wide mt-4 text-[28px] leading-none font-black uppercase">{plan.name}</h2>
                <p className="mt-2 text-[13.5px] text-ink-2">{plan.description}</p>
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[11px] text-muted uppercase">Vencimento</p>
                    <p className="text-[14px] font-semibold">{fmtFullDate(sub.data.renewsAt)}</p>
                    <p className="text-[11.5px] text-muted">em {daysBetween(new Date(), new Date(sub.data.renewsAt))} dias</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted uppercase">Valor</p>
                    <p className="text-[14px] font-semibold">{plan.priceCents === null ? 'Conforme contrato' : (plan.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="text-[11.5px] text-muted capitalize">{plan.billingCycle}</p>
                  </div>
                </div>
              </div>
            </div>
            <section>
              <SectionTitle title="Benefícios" />
              <Card className="space-y-3">
                {plan.benefits.map((b) => (
                  <p key={b} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-lift-2" /> {b}
                  </p>
                ))}
              </Card>
            </section>
          </>
        )}
        <div className="space-y-2">
          <Button block size="lg" variant="secondary" icon={<CreditCard size={17} />} disabled>
            Pagamentos (em breve)
          </Button>
          {LIFT_CONFIG.WHATSAPP && (
            <Button block size="lg" variant="outline" icon={<MessageCircle size={17} />} onClick={() => window.open(`https://wa.me/${LIFT_CONFIG.WHATSAPP}`, '_blank', 'noopener')}>
              Falar com a recepção
            </Button>
          )}
        </div>
        <IntegrationNotice>
          Plano e vencimento de demonstração. Valores, cobrança e renovação dependem da integração com o sistema financeiro da LIFT — nenhum pagamento é processado neste app.
        </IntegrationNotice>
      </div>
    </div>
  )
}
