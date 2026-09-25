import { ArrowLeft, CalendarCheck2, CalendarDays, Clock, HandCoins, Scissors, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { getProfessionalProfile } from "@/services/professionals";
import { formatTime, minutesToTime, WEEKDAY_LABELS } from "@/utils/dates";
import { formatMoney, formatPercent } from "@/utils/money";
import { formatPhone } from "@/utils/phone";

export const metadata = { title: "Profissional" };

export default async function ProfessionalProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("professionals.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let data;
  try {
    data = await getProfessionalProfile(user, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/painel/acesso-negado");
    throw error;
  }
  const { professional: p, month, topServices, todayAppointments, canSeeCommissions } = data;
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <>
      {user.role !== "PROFESSIONAL" && (
        <Link
          href="/painel/profissionais"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Profissionais
        </Link>
      )}
      <header className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60% 120% at 0% 0%, ${p.color}22, transparent 60%)` }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={p.name} src={p.photoUrl} color={p.color} size="xl" />
            <div>
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">{p.name}</h1>
              <p className="text-muted-foreground">
                {p.title}
                {p.phone && ` · ${formatPhone(p.phone)}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.specialties.map((s) => (
                  <Badge key={s.categoryId} tone="bronze">
                    {s.category.name}
                  </Badge>
                ))}
                {!p.isActive && <Badge tone="muted">Inativa</Badge>}
                <Badge tone="outline">Comissão padrão {formatPercent(p.defaultCommissionRate)}</Badge>
              </div>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href={`/painel/agenda?professional=${p.id}`}>
              <CalendarDays /> Ver agenda
            </Link>
          </Button>
        </div>
      </header>

      <section aria-label="Produção do mês" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Faturamento gerado" value={formatMoney(month.revenue)} icon={TrendingUp} tone="dark" hint="no mês" />
        {canSeeCommissions && (
          <MetricCard
            label="Comissões"
            value={formatMoney(month.commission)}
            icon={HandCoins}
            tone="terracotta"
            hint={`${formatMoney(month.pending)} a pagar`}
          />
        )}
        <MetricCard label="Atendimentos" value={month.attendances} icon={CalendarCheck2} tone="sage" hint="no mês" />
        <MetricCard label="Serviços realizados" value={month.services} icon={Scissors} tone="bronze" hint="no mês" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agenda de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <EmptyState compact icon={CalendarDays} title="Sem atendimentos hoje" />
            ) : (
              <ul className="divide-y divide-border/60">
                {todayAppointments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="tabular w-12 font-bold">{formatTime(a.startsAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{a.clientName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.serviceName}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços mais realizados no mês</CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <EmptyState compact icon={Scissors} title="Nenhum serviço pago no mês" />
            ) : (
              <ul className="space-y-3">
                {topServices.map((s) => {
                  const max = Math.max(...topServices.map((t) => t.count));
                  return (
                    <li key={s.name}>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">{s.name}</span>
                        <span className="tabular text-muted-foreground">
                          {s.count}× · {formatMoney(s.revenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${(s.count / max) * 100}%`, backgroundColor: p.color }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-bronze-500" aria-hidden /> Jornada semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/60 text-sm">
              {weekOrder.map((wd) => {
                const d = p.schedules.find((s) => s.weekday === wd);
                return (
                  <li key={wd} className="flex justify-between py-2">
                    <span className="font-medium">{WEEKDAY_LABELS[wd]}</span>
                    <span className="tabular text-muted-foreground">
                      {d
                        ? `${minutesToTime(d.startMinute)}–${minutesToTime(d.endMinute)}${d.breakStartMinute != null ? ` · pausa ${minutesToTime(d.breakStartMinute)}–${minutesToTime(d.breakEndMinute!)}` : ""}`
                        : "Folga"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços habilitados</CardTitle>
          </CardHeader>
          <CardContent>
            {p.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serviço habilitado.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {p.services.map(({ service }) => (
                  <li key={service.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.durationMinutes} min · {formatMoney(service.priceCents)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
