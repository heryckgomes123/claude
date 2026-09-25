import {
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  HandCoins,
  Receipt,
  TrendingUp,
  UsersRound,
  Vault,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { NewAppointmentButton } from "@/components/dashboard/new-appointment-button";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TodayAgenda } from "@/components/dashboard/today-agenda";
import { ChartCard } from "@/components/shared/chart-card";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { getDashboard } from "@/services/dashboard";
import { formatDateKey, zonedParts } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { firstName } from "@/utils/text";

export const metadata = { title: "Visão Geral" };

function greeting() {
  const hour = zonedParts(new Date()).hour;
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

export default async function DashboardPage() {
  const user = await requirePagePermission("dashboard.view");
  const data = await getDashboard(user);
  const m = data.metrics;
  const isProfessional = user.role === "PROFESSIONAL";
  const occupancyPct = Math.round(m.occupancy * 100);

  return (
    <>
      <PageHeader
        eyebrow={formatDateKey(data.today, "long")}
        title={`${greeting()}, ${firstName(user.name)}`}
        description={
          isProfessional
            ? "Seu dia na R Beauty: agenda, atendimentos e produção."
            : data.financial
              ? "Visão completa da operação de hoje — em tempo real."
              : "Operação do dia: agenda, chegadas e cobranças."
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/painel/agenda">
                <CalendarDays /> Agenda
              </Link>
            </Button>
            <NewAppointmentButton />
          </>
        }
      />

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {data.financial && (
          <>
            <MetricCard label="Faturamento hoje" value={formatMoney(m.revenueTodayCents)} icon={CircleDollarSign} tone="dark" />
            <MetricCard label="Faturamento do mês" value={formatMoney(m.revenueMonthCents)} icon={TrendingUp} tone="terracotta" />
          </>
        )}
        {isProfessional && data.production && (
          <>
            <MetricCard
              label="Produção do mês"
              value={formatMoney(data.production.revenueCents)}
              icon={TrendingUp}
              tone="dark"
              hint={`${data.production.services} serviço(s)`}
            />
            <MetricCard
              label="Comissão do mês"
              value={formatMoney(data.production.commissionCents)}
              icon={HandCoins}
              tone="terracotta"
              hint={`${formatMoney(data.production.pendingCents)} a receber`}
            />
          </>
        )}
        <MetricCard
          label={isProfessional ? "Meus atendimentos" : "Atendimentos hoje"}
          value={m.appointmentsToday}
          icon={CalendarCheck2}
          tone="bronze"
          hint={`${m.completedToday} finalizado(s)`}
        />
        <MetricCard label="Clientes atendidas" value={m.clientsServedToday} icon={UsersRound} tone="sage" hint="hoje" />
        {data.financial ? (
          <MetricCard label="Ticket médio" value={formatMoney(m.averageTicketCents)} icon={Receipt} tone="plum" hint="no mês" />
        ) : (
          !isProfessional && (
            <MetricCard
              label="Aguardando pagamento"
              value={m.awaitingPayment}
              icon={Wallet}
              tone="plum"
              hint={m.awaitingPayment ? "cobrar na recepção" : "nenhuma pendência"}
            />
          )
        )}
        <MetricCard
          label="Ocupação da agenda"
          value={`${occupancyPct}%`}
          icon={Gauge}
          tone="terracotta"
          hint={
            <span className="mt-1 block">
              <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-terracotta-300 to-terracotta-500"
                  style={{ width: `${occupancyPct}%` }}
                />
              </span>
            </span>
          }
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="animate-slide-up">
          <CardHeader>
            <div>
              <CardTitle>{isProfessional ? "Minha agenda de hoje" : "Agenda de hoje"}</CardTitle>
              <CardDescription>Confirme, receba a cliente e inicie o atendimento daqui.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/painel/agenda">Ver agenda</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <TodayAgenda items={data.agenda} showProfessional={!isProfessional} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Alertas</CardTitle>
                <CardDescription>Baseados nos dados de hoje.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-3">
              <AlertsList alerts={data.alerts} />
            </CardContent>
          </Card>

          {data.canSeeCash && (
            <Card className={data.cashOpen ? "" : "border-bronze-200 bg-bronze-50/60"}>
              <CardContent className="flex items-center gap-4 pt-5">
                <span
                  className={`grid size-11 place-items-center rounded-2xl ${data.cashOpen ? "bg-sage-100 text-sage-700" : "bg-bronze-100 text-bronze-700"}`}
                >
                  <Vault className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{data.cashOpen ? "Caixa aberto" : "Caixa fechado"}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.cashOpen ? "Pagamentos entram automaticamente." : "Abra o caixa para registrar pagamentos."}
                  </p>
                </div>
                <Button asChild size="sm" variant={data.cashOpen ? "outline" : "default"}>
                  <Link href="/painel/caixa">{data.cashOpen ? "Ver caixa" : "Abrir caixa"}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {data.financial && (
        <div className="mt-6">
          <ChartCard
            title="Faturamento dos últimos 7 dias"
            description={`Total: ${formatMoney(data.chart.reduce((s, d) => s + d.revenueCents, 0))}`}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/painel/financeiro">Financeiro</Link>
              </Button>
            }
          >
            <RevenueChart data={data.chart} />
          </ChartCard>
        </div>
      )}
    </>
  );
}
