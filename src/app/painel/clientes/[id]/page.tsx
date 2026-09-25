import { ArrowLeft, CalendarClock, Cake, CalendarDays, History, NotebookPen, Receipt, Repeat, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientProfileActions } from "@/components/clients/client-profile-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePagePermission } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { listClientUpcoming } from "@/services/appointments";
import { getClientProfile } from "@/services/clients";
import { formatDate, formatDateKey, formatDateTime, formatTime } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { formatPhone } from "@/utils/phone";
import { redirect } from "next/navigation";

export const metadata = { title: "Perfil da cliente" };

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("clients.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let profile;
  try {
    profile = await getClientProfile(user, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/painel/acesso-negado");
    throw error;
  }
  const upcoming = await listClientUpcoming(user, id);
  const { client, stats, history } = profile;

  return (
    <>
      <Link
        href="/painel/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Clientes
      </Link>

      <header className="mb-6 flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} color="#b58a58" size="xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">{client.name}</h1>
              {!client.isActive && <Badge tone="muted">Inativa</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {client.phone && <span>Tel. {formatPhone(client.phone)}</span>}
              {client.whatsapp && <span>WhatsApp {formatPhone(client.whatsapp)}</span>}
              {client.birthDate && (
                <span className="inline-flex items-center gap-1">
                  <Cake className="size-3.5" aria-hidden /> {formatDateKey(client.birthDate, "short")}
                </span>
              )}
              {client.email && <span>{client.email}</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Cliente desde {formatDate(client.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ClientProfileActions
            isActive={client.isActive}
            client={{
              id: client.id,
              name: client.name,
              phone: client.phone,
              whatsapp: client.whatsapp,
              email: client.email,
              birthDate: client.birthDate,
              notes: client.notes,
            }}
          />
        </div>
      </header>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          label="Última visita"
          value={stats.lastVisitAt ? formatDate(stats.lastVisitAt) : "—"}
          icon={CalendarDays}
          tone="bronze"
        />
        <MetricCard label="Total de visitas" value={stats.visits} icon={Repeat} tone="sage" />
        <MetricCard label="Total gasto" value={formatMoney(stats.totalSpentCents)} icon={Wallet} tone="dark" />
        <MetricCard label="Ticket médio" value={formatMoney(stats.averageTicketCents)} icon={Receipt} tone="terracotta" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-bronze-500" aria-hidden /> Histórico
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {history.length === 0 ? (
              <div className="px-5 pb-4">
                <EmptyState compact title="Sem histórico ainda" description="Os atendimentos da cliente aparecerão aqui." />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Data</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.appointmentId}>
                      <TableCell className="tabular whitespace-nowrap">
                        {h.attendanceId ? (
                          <Link href={`/painel/atendimentos/${h.attendanceId}`} className="font-semibold hover:text-primary">
                            {formatDateTime(h.date)}
                          </Link>
                        ) : (
                          formatDateTime(h.date)
                        )}
                      </TableCell>
                      <TableCell className="max-w-56 truncate">{h.services}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{h.professionalName}</TableCell>
                      <TableCell className="tabular text-right font-semibold">{formatMoney(h.valueCents)}</TableCell>
                      <TableCell>
                        <StatusBadge status={h.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-bronze-500" aria-hidden /> Próximos agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/painel/agenda?appointment=${a.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-muted/50"
                      >
                        <span className="h-9 w-1 rounded-full" style={{ backgroundColor: a.professionalColor }} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {formatDate(a.startsAt)} · {formatTime(a.startsAt)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {a.serviceName} · {a.professionalName}
                          </span>
                        </span>
                        <StatusBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="size-4 text-bronze-500" aria-hidden /> Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line text-secondary-foreground">{client.notes || "Nenhuma observação registrada."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
