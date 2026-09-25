"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatTime } from "@/utils/dates";
import { firstName } from "@/utils/text";
import { type AppointmentItem, AppointmentMenu, useAppointmentActionList, useAppointmentActions } from "./appointment-actions";

/** Item de agenda: horário, cliente, serviço, profissional, status e ações. */
export function AppointmentCard({ appointment: a, showProfessional = true }: { appointment: AppointmentItem; showProfessional?: boolean }) {
  const { view, pending } = useAppointmentActions();
  const actions = useAppointmentActionList(a);
  const primary = actions.find((x) => x.primary);
  const muted = a.status === "CANCELLED" || a.status === "NO_SHOW";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-muted/40 sm:gap-4 sm:px-3",
        muted && "opacity-60",
      )}
    >
      <button type="button" onClick={() => view(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4">
        <div className="tabular w-12 shrink-0 text-center">
          <p className={cn("text-[0.95rem] leading-none font-extrabold", muted && "line-through")}>{formatTime(a.startsAt)}</p>
          <p className="mt-1 text-[0.65rem] font-medium text-muted-foreground">{a.durationMinutes} min</p>
        </div>
        <span className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: a.professionalColor }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{a.clientName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {a.serviceName}
            {showProfessional && <> · {firstName(a.professionalName)}</>}
          </p>
        </div>
      </button>
      <StatusBadge status={a.status} className="hidden sm:inline-flex" />
      {primary && (
        <Button
          size="sm"
          variant={primary.key === "open" ? "soft" : "outline"}
          onClick={primary.run}
          disabled={pending}
          className="hidden md:inline-flex"
        >
          <primary.icon /> {primary.label}
        </Button>
      )}
      <AppointmentMenu appointment={a} />
    </div>
  );
}
