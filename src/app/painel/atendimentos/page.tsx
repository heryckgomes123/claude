import { ArrowRight, Clock, DoorOpen, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { StartAttendanceButton, WalkInButton } from "@/components/attendance/start-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { AttendanceBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_METHOD_LABELS } from "@/config/domain";
import { requirePagePermission } from "@/lib/auth/session";
import { listReceptionQueue } from "@/services/appointments";
import { listAttendanceBoard } from "@/services/attendance";
import { formatTime } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { firstName } from "@/utils/text";

export const metadata = { title: "Atendimento" };

type BoardRow = Awaited<ReturnType<typeof listAttendanceBoard>>[number];

function AttendanceTile({ row }: { row: BoardRow }) {
  return (
    <Link
      href={`/painel/atendimentos/${row.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted"
    >
      <Avatar name={row.professionalName} color={row.professionalColor} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{row.clientName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {row.services} · {firstName(row.professionalName)} · desde {formatTime(row.startedAt)}
        </p>
      </div>
      <div className="text-right">
        <p className="tabular font-bold">{formatMoney(row.totalCents)}</p>
        {row.paymentMethod ? (
          <p className="text-[0.7rem] text-muted-foreground">{PAYMENT_METHOD_LABELS[row.paymentMethod]}</p>
        ) : (
          <AttendanceBadge status={row.status} className="mt-0.5" />
        )}
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export default async function AttendancePage() {
  const user = await requirePagePermission("attendance.view");
  const [board, waiting] = await Promise.all([listAttendanceBoard(user), listReceptionQueue(user)]);
  const inProgress = board.filter((r) => r.status === "IN_PROGRESS");
  const awaiting = board.filter((r) => r.status === "AWAITING_PAYMENT");
  const done = board.filter((r) => r.status === "PAID");

  const columns = [
    { key: "progress", title: "Em atendimento", icon: Sparkles, rows: inProgress, empty: "Nenhum atendimento em andamento." },
    { key: "awaiting", title: "Aguardando pagamento", icon: Wallet, rows: awaiting, empty: "Nenhuma cobrança pendente." },
    { key: "done", title: "Finalizados hoje", icon: Clock, rows: done, empty: "Nenhum atendimento pago hoje." },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Atendimento"
        description="Cliente chegou → iniciar → finalizar → pagamento. Tudo em sequência."
        actions={<WalkInButton />}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="size-4 text-bronze-500" aria-hidden /> Na recepção e próximas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cliente aguardando início agora.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {waiting.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                  <span className="tabular w-12 text-center font-extrabold">{formatTime(a.startsAt)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.clientName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.serviceName} · {firstName(a.professionalName)} · {a.status === "ARRIVED" ? "chegou" : "confirmada"}
                    </span>
                  </span>
                  <StartAttendanceButton appointment={a} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((col) => (
          <section key={col.key} aria-labelledby={`col-${col.key}`}>
            <h2
              id={`col-${col.key}`}
              className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-muted-foreground uppercase"
            >
              <col.icon className="size-4" aria-hidden /> {col.title}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{col.rows.length}</span>
            </h2>
            <div className="space-y-2">
              {col.rows.length === 0 ? (
                <EmptyState compact icon={col.icon} title={col.empty} />
              ) : (
                col.rows.map((row) => <AttendanceTile key={row.id} row={row} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
