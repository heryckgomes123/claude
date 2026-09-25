"use client";

import { CalendarClock, CalendarX2, CheckCircle2, DoorOpen, Eye, MoreHorizontal, Phone, PlayCircle, Sparkles, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { changeAppointmentStatusAction } from "@/actions/appointments";
import { startAttendanceAction } from "@/actions/attendance";
import { useCan } from "@/components/layout/app-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AppointmentStatus } from "@/config/domain";
import { useServerAction } from "@/hooks/use-server-action";
import { formatLongDate, formatTime, hasPassed, toDateKey } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { formatPhone, whatsappLink } from "@/utils/phone";
import { AppointmentFormDialog, type ReschedulableAppointment } from "./appointment-form-dialog";

/** Forma serializável de um agendamento usada pela interface. */
export type AppointmentItem = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  priceCents: number;
  status: AppointmentStatus;
  notes: string | null;
  cancelReason: string | null;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientWhatsapp: string | null;
  professionalId: string;
  professionalName: string;
  professionalColor: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  attendanceId: string | null;
  attendanceStatus: string | null;
};

type Ctx = {
  view: (a: AppointmentItem) => void;
  reschedule: (a: AppointmentItem) => void;
  cancel: (a: AppointmentItem) => void;
  setStatus: (a: AppointmentItem, status: AppointmentStatus, success: string) => void;
  start: (a: AppointmentItem) => void;
  pending: boolean;
};

const AppointmentActionsContext = createContext<Ctx | null>(null);
export const useAppointmentActions = () => {
  const ctx = useContext(AppointmentActionsContext);
  if (!ctx) throw new Error("AppointmentActionsProvider ausente");
  return ctx;
};

function toReschedulable(a: AppointmentItem): ReschedulableAppointment {
  return {
    id: a.id,
    date: toDateKey(new Date(a.startsAt)),
    time: formatTime(a.startsAt),
    clientId: a.clientId,
    clientName: a.clientName,
    clientPhone: a.clientPhone,
    serviceId: a.serviceId,
    professionalId: a.professionalId,
    durationMinutes: a.durationMinutes,
    priceCents: a.priceCents,
    notes: a.notes,
  };
}

/** Centraliza detalhes, remarcação, cancelamento e mudanças de status de agendamentos. */
export function AppointmentActionsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { pending, run } = useServerAction();
  const [viewing, setViewing] = useState<AppointmentItem | null>(null);
  const [rescheduling, setRescheduling] = useState<AppointmentItem | null>(null);
  const [cancelling, setCancelling] = useState<AppointmentItem | null>(null);

  const setStatus = useCallback(
    (a: AppointmentItem, status: AppointmentStatus, success: string) =>
      run(() => changeAppointmentStatusAction({ appointmentId: a.id, status }), {
        success,
        onSuccess: () => setViewing((v) => (v?.id === a.id ? { ...v, status } : v)),
      }),
    [run],
  );

  const start = useCallback(
    (a: AppointmentItem) =>
      run(() => startAttendanceAction({ appointmentId: a.id }), {
        success: "Atendimento iniciado.",
        onSuccess: (res) => {
          setViewing(null);
          router.push(`/painel/atendimentos/${res.id}`);
        },
      }),
    [run, router],
  );

  const value = useMemo<Ctx>(
    () => ({
      view: setViewing,
      reschedule: (a) => {
        setViewing(null);
        setRescheduling(a);
      },
      cancel: (a) => {
        setViewing(null);
        setCancelling(a);
      },
      setStatus,
      start,
      pending,
    }),
    [setStatus, start, pending],
  );

  return (
    <AppointmentActionsContext.Provider value={value}>
      {children}
      <AppointmentDetailsSheet appointment={viewing} onClose={() => setViewing(null)} />
      <AppointmentFormDialog
        open={rescheduling !== null}
        onOpenChange={(open) => !open && setRescheduling(null)}
        appointment={rescheduling ? toReschedulable(rescheduling) : null}
      />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancelar agendamento?"
        description={
          cancelling
            ? `${cancelling.clientName} · ${cancelling.serviceName} às ${formatTime(cancelling.startsAt)}. O horário ficará livre na agenda.`
            : undefined
        }
        reasonLabel="Motivo do cancelamento"
        confirmLabel="Cancelar agendamento"
        destructive
        onConfirm={async (reason) => {
          if (!cancelling) return;
          const res = await changeAppointmentStatusAction({ appointmentId: cancelling.id, status: "CANCELLED", reason });
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast.success("Agendamento cancelado.");
        }}
      />
    </AppointmentActionsContext.Provider>
  );
}

type ActionDef = { key: string; label: string; icon: typeof Eye; run: () => void; tone?: "danger"; primary?: boolean };

/** Ações disponíveis conforme status + permissões. */
export function useAppointmentActionList(a: AppointmentItem): ActionDef[] {
  const can = useCan();
  const router = useRouter();
  const actions = useAppointmentActions();
  const list: ActionDef[] = [];
  const started = hasPassed(a.startsAt);

  if (a.attendanceId) {
    list.push({
      key: "open",
      label: a.status === "COMPLETED" ? "Ver atendimento" : "Abrir atendimento",
      icon: Sparkles,
      run: () => router.push(`/painel/atendimentos/${a.attendanceId}`),
      primary: true,
    });
  }
  if (a.status === "SCHEDULED" && can("appointments.status")) {
    list.push({
      key: "confirm",
      label: "Confirmar",
      icon: CheckCircle2,
      run: () => actions.setStatus(a, "CONFIRMED", "Agendamento confirmado."),
      primary: true,
    });
  }
  if (["SCHEDULED", "CONFIRMED"].includes(a.status) && can("appointments.status")) {
    list.push({
      key: "arrived",
      label: "Cliente chegou",
      icon: DoorOpen,
      run: () => actions.setStatus(a, "ARRIVED", `${a.clientName} chegou.`),
      primary: a.status === "CONFIRMED",
    });
  }
  if (["SCHEDULED", "CONFIRMED", "ARRIVED"].includes(a.status) && !a.attendanceId && can("attendance.create")) {
    list.push({
      key: "start",
      label: "Iniciar atendimento",
      icon: PlayCircle,
      run: () => actions.start(a),
      primary: a.status === "ARRIVED",
    });
  }
  if (["SCHEDULED", "CONFIRMED"].includes(a.status) && can("appointments.edit")) {
    list.push({ key: "reschedule", label: "Remarcar", icon: CalendarClock, run: () => actions.reschedule(a) });
  }
  if (["SCHEDULED", "CONFIRMED"].includes(a.status) && started && can("appointments.status")) {
    list.push({ key: "noshow", label: "Não compareceu", icon: UserX, run: () => actions.setStatus(a, "NO_SHOW", "Falta registrada.") });
  }
  if (["SCHEDULED", "CONFIRMED", "ARRIVED"].includes(a.status) && can("appointments.cancel")) {
    list.push({ key: "cancel", label: "Cancelar", icon: CalendarX2, run: () => actions.cancel(a), tone: "danger" });
  }
  return list;
}

/** Menu "…" com todas as ações do agendamento. */
export function AppointmentMenu({ appointment, className }: { appointment: AppointmentItem; className?: string }) {
  const actions = useAppointmentActions();
  const list = useAppointmentActionList(appointment);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={className} aria-label={`Ações do agendamento de ${appointment.clientName}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => actions.view(appointment)}>
          <Eye /> Visualizar
        </DropdownMenuItem>
        {list.length > 0 && <DropdownMenuSeparator />}
        {list.map((action) => (
          <DropdownMenuItem key={action.key} onSelect={action.run} tone={action.tone}>
            <action.icon /> {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppointmentDetailsSheet({ appointment: a, onClose }: { appointment: AppointmentItem | null; onClose: () => void }) {
  return (
    <Sheet open={a !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>{a && <DetailsBody a={a} />}</SheetContent>
    </Sheet>
  );
}

function DetailsBody({ a }: { a: AppointmentItem }) {
  const list = useAppointmentActionList(a);
  const { pending } = useAppointmentActions();
  const wa = whatsappLink(a.clientWhatsapp ?? a.clientPhone);
  return (
    <>
      <SheetHeader>
        <StatusBadge status={a.status} className="mb-2" />
        <SheetTitle>{a.clientName}</SheetTitle>
        <SheetDescription className="capitalize">
          {formatLongDate(a.startsAt)} · {formatTime(a.startsAt)}–{formatTime(a.endsAt)}
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2 rounded-xl bg-muted/60 p-3">
            <dt className="text-xs font-semibold text-muted-foreground">Serviço</dt>
            <dd className="mt-0.5 font-semibold">{a.serviceName}</dd>
            <dd className="text-xs text-muted-foreground">
              {a.categoryName} · {a.durationMinutes} min
            </dd>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-xs font-semibold text-muted-foreground">Profissional</dt>
            <dd className="mt-1 flex items-center gap-2 font-semibold">
              <Avatar name={a.professionalName} color={a.professionalColor} size="xs" className="ring-0" /> {a.professionalName}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-xs font-semibold text-muted-foreground">Valor</dt>
            <dd className="tabular mt-0.5 font-bold">{formatMoney(a.priceCents)}</dd>
          </div>
          {(a.clientPhone || a.clientWhatsapp) && (
            <div className="col-span-2 flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Contato</dt>
                <dd className="mt-0.5 font-medium">{formatPhone(a.clientWhatsapp ?? a.clientPhone)}</dd>
              </div>
              <div className="flex gap-1.5">
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${a.clientPhone ?? a.clientWhatsapp}`}>
                    <Phone /> Ligar
                  </a>
                </Button>
                {wa && (
                  <Button asChild variant="outline" size="sm">
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
          {a.notes && (
            <div className="col-span-2 rounded-xl border border-bronze-100 bg-bronze-50 p-3">
              <dt className="text-xs font-semibold text-bronze-600">Observação</dt>
              <dd className="mt-0.5 whitespace-pre-line">{a.notes}</dd>
            </div>
          )}
          {a.cancelReason && (
            <div className="col-span-2 rounded-xl border border-[#f0d3ce] bg-[#fdf6f4] p-3">
              <dt className="text-xs font-semibold text-destructive">Motivo do cancelamento</dt>
              <dd className="mt-0.5">{a.cancelReason}</dd>
            </div>
          )}
        </dl>
        <Link href={`/painel/clientes/${a.clientId}`} className="inline-block text-sm font-semibold text-primary hover:underline">
          Ver perfil da cliente →
        </Link>
      </SheetBody>
      {list.length > 0 && (
        <SheetFooter>
          {list.map((action) => (
            <Button
              key={action.key}
              variant={action.tone === "danger" ? "ghost" : action.primary ? "default" : "outline"}
              className={action.tone === "danger" ? "text-destructive hover:bg-[#fdf6f4]" : undefined}
              onClick={action.run}
              disabled={pending}
            >
              <action.icon /> {action.label}
            </Button>
          ))}
        </SheetFooter>
      )}
    </>
  );
}
