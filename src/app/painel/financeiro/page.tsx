import { ArrowDownRight, BadgePercent, CircleDollarSign, HandCoins, Receipt, Scale } from "lucide-react";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { BreakdownBars } from "@/components/finance/breakdown-bars";
import { PeriodFilter } from "@/components/finance/period-filter";
import { ChartCard } from "@/components/shared/chart-card";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_METHOD_LABELS } from "@/config/domain";
import { requirePagePermission } from "@/lib/auth/session";
import { getFinanceOverview } from "@/services/finance";
import { formatDateTime } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { resolvePeriod } from "@/utils/period";

export const metadata = { title: "Financeiro" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const user = await requirePagePermission("finance.view");
  const period = resolvePeriod(await searchParams);
  const data = await getFinanceOverview(user, period);

  return (
    <>
      <PageHeader eyebrow="Gestão" title="Financeiro" description={`Visão simples do resultado — ${period.label.toLowerCase()}.`} />
      <div className="mb-6">
        <PeriodFilter period={period} />
      </div>

      <section aria-label="Resultado" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Receita"
          value={formatMoney(data.revenueCents)}
          icon={CircleDollarSign}
          tone="dark"
          hint={`${data.paymentsCount} pagamento(s)`}
        />
        <MetricCard
          label="Despesas"
          value={formatMoney(data.expensesCents)}
          icon={ArrowDownRight}
          tone="terracotta"
          hint="saídas do caixa"
        />
        <MetricCard label="Comissões" value={formatMoney(data.commissionsCents)} icon={HandCoins} tone="bronze" />
        <MetricCard
          label="Resultado operacional"
          value={formatMoney(data.resultCents)}
          icon={Scale}
          tone={data.resultCents >= 0 ? "sage" : "terracotta"}
          hint="estimado"
        />
        <MetricCard label="Ticket médio" value={formatMoney(data.averageTicketCents)} icon={Receipt} tone="plum" />
        <MetricCard label="Descontos" value={formatMoney(data.discountCents)} icon={BadgePercent} tone="bronze" />
      </section>

      <div className="mt-6">
        <ChartCard title="Receita por dia" description={period.label}>
          <RevenueChart data={data.byDay} height={260} />
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita por serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBars
              items={data.byService.map((s) => ({ label: s.name, sublabel: `${s.category} · ${s.count}×`, valueCents: s.totalCents }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receita por forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBars
              colors={["#4f6f7a", "#6f7f5e", "#9c7248", "#b4583f", "#7c5a7a"]}
              items={data.byMethod.map((m) => ({
                label: PAYMENT_METHOD_LABELS[m.method],
                sublabel: `${m.count} pagamento(s)`,
                valueCents: m.totalCents,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Despesas recentes no período</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa registrada no período.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.recentExpenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{e.description}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(e.createdAt)} · {PAYMENT_METHOD_LABELS[e.method]}
                    </span>
                  </span>
                  <span className="tabular font-bold text-destructive">− {formatMoney(e.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Despesas são lançadas no Caixa como “Saída”. Resultado operacional = receita − despesas − comissões.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
