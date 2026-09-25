import { ArrowLeft, CalendarClock, NotebookPen, Receipt } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import { AttendanceBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAYMENT_METHOD_LABELS } from "@/config/domain";
import { can, requirePagePermission } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { getAttendance } from "@/services/attendance";
import { formatDateTime, formatTime } from "@/utils/dates";
import { formatMoney, formatPercent } from "@/utils/money";
import { formatPhone } from "@/utils/phone";

export const metadata = { title: "Atendimento" };

export default async function AttendanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("attendance.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let att;
  try {
    att = await getAttendance(user, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/painel/acesso-negado");
    throw error;
  }

  const seesAllCommissions = can(user, "commissions.view");
  const visibleCommissions = att.commissions.filter((c) => seesAllCommissions || c.professionalId === user.professionalId);
  const itemById = new Map(att.items.map((i) => [i.id, i]));

  return (
    <>
      <Link
        href="/painel/atendimentos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Atendimentos
      </Link>

      <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar name={att.client.name} color="#b58a58" size="lg" />
          <div>
            <AttendanceBadge status={att.status} className="mb-1" />
            <h1 className="font-display text-3xl font-semibold">
              <Link href={`/painel/clientes/${att.client.id}`} className="hover:text-primary">
                {att.client.name}
              </Link>
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatPhone(att.client.whatsapp ?? att.client.phone)}
              {att.client.whatsapp || att.client.phone ? " · " : ""}
              Início {formatTime(att.startedAt)}
              {att.finishedAt && ` · Fim ${formatTime(att.finishedAt)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3">
          <Avatar name={att.professional.name} color={att.professional.color} size="sm" className="ring-0" />
          <div className="text-sm">
            <p className="font-semibold">{att.professional.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" aria-hidden />
              Agendado {formatTime(att.appointment.startsAt)}–{formatTime(att.appointment.endsAt)}
            </p>
          </div>
        </div>
      </header>

      {(att.notes || att.client.notes) && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-bronze-100 bg-bronze-50 p-4 text-sm">
          <NotebookPen className="mt-0.5 size-4 shrink-0 text-bronze-600" aria-hidden />
          <div className="space-y-1">
            {att.notes && (
              <p>
                <span className="font-semibold">Observação do agendamento:</span> {att.notes}
              </p>
            )}
            {att.client.notes && (
              <p>
                <span className="font-semibold">Sobre a cliente:</span> {att.client.notes}
              </p>
            )}
          </div>
        </div>
      )}

      <AttendanceWorkspace
        attendanceId={att.id}
        status={att.status}
        professionalId={att.professionalId}
        subtotalCents={att.subtotalCents}
        discountCents={att.discountCents}
        totalCents={att.totalCents}
        showCommission={seesAllCommissions}
        items={att.items.map((i) => ({
          id: i.id,
          serviceName: i.service.name,
          professionalName: i.professional.name,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          totalCents: i.totalCents,
          commissionRate: i.commissionRate,
          durationMinutes: i.service.durationMinutes,
        }))}
      />

      {att.payment && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-4 text-bronze-500" aria-hidden /> Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Valor bruto</dt>
                <dd className="tabular text-right">{formatMoney(att.payment.grossCents)}</dd>
                <dt className="text-muted-foreground">Desconto</dt>
                <dd className="tabular text-right">− {formatMoney(att.payment.discountCents)}</dd>
                <dt className="font-semibold">Valor final</dt>
                <dd className="tabular text-right font-bold">{formatMoney(att.payment.amountCents)}</dd>
                <dt className="text-muted-foreground">Método</dt>
                <dd className="text-right">
                  {PAYMENT_METHOD_LABELS[att.payment.method]}
                  {att.payment.installments > 1 && ` · ${att.payment.installments}x`}
                </dd>
                <dt className="text-muted-foreground">Data</dt>
                <dd className="text-right">{formatDateTime(att.payment.paidAt)}</dd>
                <dt className="text-muted-foreground">Responsável</dt>
                <dd className="text-right">{att.payment.receivedBy?.name ?? "—"}</dd>
              </dl>
            </CardContent>
          </Card>
          {visibleCommissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comissões geradas</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCommissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{itemById.get(c.attendanceItemId)?.service.name}</TableCell>
                        <TableCell className="tabular text-right">{formatMoney(c.baseCents)}</TableCell>
                        <TableCell className="tabular text-right">{formatPercent(c.rate)}</TableCell>
                        <TableCell className="tabular text-right font-bold">{formatMoney(c.amountCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
