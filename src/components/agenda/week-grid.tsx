"use client";

import Link from "next/link";
import { useAppointmentActions } from "@/components/appointments/appointment-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/utils/cn";
import { addDays, formatDateKey, formatTime, todayKey, toDateKey } from "@/utils/dates";
import { firstName } from "@/utils/text";
import type { AgendaPayload } from "./types";

/** Visão semanal: 7 colunas (desktop) ou lista por dia (mobile). */
export function WeekGrid({ data, buildHref }: { data: AgendaPayload; buildHref: (patch: Record<string, string | null>) => string }) {
  const { view } = useAppointmentActions();
  const days = Array.from({ length: 7 }, (_, i) => addDays(data.from, i));
  const today = todayKey();
  const byDay = new Map(days.map((d) => [d, data.appointments.filter((a) => toDateKey(new Date(a.startsAt)) === d)]));

  return (
    <div className="grid gap-3 md:grid-cols-7 md:gap-2">
      {days.map((d) => {
        const list = byDay.get(d) ?? [];
        const active = list.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW");
        const isToday = d === today;
        return (
          <section
            key={d}
            className={cn(
              "flex min-h-40 flex-col rounded-2xl border bg-card shadow-soft",
              isToday ? "border-terracotta-200 ring-2 ring-terracotta-100" : "border-border",
            )}
          >
            <Link
              href={buildHref({ view: "day", date: d })}
              className="flex items-baseline justify-between gap-2 border-b border-border/70 px-3 py-2.5 transition hover:bg-muted/50"
            >
              <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{formatDateKey(d, "weekday")}</span>
              <span className={cn("tabular text-lg font-extrabold", isToday && "text-primary")}>{d.slice(8)}</span>
            </Link>
            <div className="flex-1 space-y-1.5 p-2">
              {list.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Livre</p>
              ) : (
                list.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => view(a)}
                    className={cn(
                      "w-full rounded-lg border-l-[3px] bg-muted/40 px-2 py-1.5 text-left text-xs transition hover:bg-muted",
                      (a.status === "CANCELLED" || a.status === "NO_SHOW") && "opacity-50 line-through",
                    )}
                    style={{ borderLeftColor: a.professionalColor }}
                  >
                    <span className="tabular font-bold">{formatTime(a.startsAt)}</span>{" "}
                    <span className="font-semibold">{firstName(a.clientName)}</span>
                    <span className="block truncate text-muted-foreground">{a.serviceName}</span>
                    <span className="mt-1 flex items-center justify-between gap-1 md:hidden">
                      <span className="text-muted-foreground">{firstName(a.professionalName)}</span>
                      <StatusBadge status={a.status} />
                    </span>
                  </button>
                ))
              )}
            </div>
            {active.length > 0 && (
              <p className="border-t border-border/60 px-3 py-1.5 text-[0.68rem] font-semibold text-muted-foreground">
                {active.length} agendamento(s)
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
