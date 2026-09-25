"use client";

import { Ban } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppointmentActions } from "@/components/appointments/appointment-actions";
import { useCan } from "@/components/layout/app-context";
import { useQuickActions } from "@/components/layout/quick-actions";
import { APPOINTMENT_STATUS_LABELS } from "@/config/domain";
import { cn } from "@/utils/cn";
import { formatTime, minutesOfDay, minutesToTime, todayKey, toDateKey, weekdayOf } from "@/utils/dates";
import { firstName } from "@/utils/text";
import { Avatar } from "@/components/ui/avatar";
import type { AgendaPayload } from "./types";

const PX_PER_MIN = 1.4;
const PAD = 12;
const SNAP = 15;

/** Grade diária por profissional (desktop/tablet). Clique em horário vazio cria agendamento. */
export function DayGrid({ data }: { data: AgendaPayload }) {
  const { view } = useAppointmentActions();
  const { newAppointment } = useQuickActions();
  const can = useCan();
  const weekday = weekdayOf(data.date);
  const business = data.hours.find((h) => h.weekday === weekday);

  const columnSchedules = data.columns.map((c) => c.schedules.find((s) => s.weekday === weekday));
  const starts = [business?.openMinute ?? 540, ...columnSchedules.filter(Boolean).map((s) => s!.startMinute)];
  const ends = [business?.closeMinute ?? 1140, ...columnSchedules.filter(Boolean).map((s) => s!.endMinute)];
  const dayAppointments = data.appointments.filter((a) => toDateKey(new Date(a.startsAt)) === data.date);
  for (const a of dayAppointments) {
    starts.push(minutesOfDay(new Date(a.startsAt)));
    ends.push(minutesOfDay(new Date(a.endsAt)));
  }
  const gridStart = Math.floor(Math.min(...starts) / 60) * 60;
  const gridEnd = Math.ceil(Math.max(...ends) / 60) * 60;
  const height = (gridEnd - gridStart) * PX_PER_MIN + PAD * 2;
  const hours = Array.from({ length: (gridEnd - gridStart) / 60 + 1 }, (_, i) => gridStart + i * 60);

  const [nowMinute, setNowMinute] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNowMinute(data.date === todayKey() ? minutesOfDay(new Date()) : null);
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [data.date]);

  const y = (minute: number) => (minute - gridStart) * PX_PER_MIN + PAD;

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
      <div className="min-w-fit" style={{ minWidth: `${72 + data.columns.length * 190}px` }}>
        {/* Cabeçalho das profissionais */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-card/95 backdrop-blur">
          <div className="w-[72px] shrink-0" />
          {data.columns.map((c, i) => (
            <div key={c.id} className="flex min-w-[190px] flex-1 items-center gap-2.5 border-l border-border/70 px-3 py-3">
              <Avatar name={c.name} color={c.color} size="sm" className="ring-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {columnSchedules[i]
                    ? `${minutesToTime(columnSchedules[i]!.startMinute)}–${minutesToTime(columnSchedules[i]!.endMinute)}`
                    : "Folga"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative flex" style={{ height }}>
          {/* Régua de horas */}
          <div className="relative w-[72px] shrink-0">
            {hours.map((h) => (
              <span
                key={h}
                className="tabular absolute right-3 -translate-y-1/2 text-[0.7rem] font-semibold text-muted-foreground"
                style={{ top: y(h) }}
              >
                {h < gridEnd ? minutesToTime(h) : ""}
              </span>
            ))}
          </div>

          {data.columns.map((c, i) => {
            const schedule = columnSchedules[i];
            const open = business?.isOpen && schedule;
            const workStart = open ? Math.max(schedule.startMinute, business!.openMinute) : gridEnd;
            const workEnd = open ? Math.min(schedule.endMinute, business!.closeMinute) : gridEnd;
            const breaks = [
              schedule?.breakStartMinute != null ? [schedule.breakStartMinute, schedule.breakEndMinute!] : null,
              business?.breakStartMinute != null ? [business.breakStartMinute, business.breakEndMinute!] : null,
            ].filter(Boolean) as [number, number][];
            const items = dayAppointments.filter((a) => a.professionalId === c.id);
            const blocks = data.blocks.filter(
              (b) =>
                (b.professionalId === null || b.professionalId === c.id) &&
                toDateKey(new Date(b.startsAt)) <= data.date &&
                toDateKey(new Date(b.endsAt)) >= data.date,
            );

            return (
              <div key={c.id} className="relative min-w-[190px] flex-1 border-l border-border/70">
                {/* Linhas de hora e meia hora */}
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: y(h) }}>
                    <div className="absolute inset-x-0 border-t border-dashed border-border/40" style={{ top: 30 * PX_PER_MIN }} />
                  </div>
                ))}
                {/* Fora do expediente */}
                <div className="hatched absolute inset-x-0 bg-muted/50" style={{ top: 0, height: Math.max(0, y(workStart)) }} />
                <div className="hatched absolute inset-x-0 bg-muted/50" style={{ top: y(workEnd), bottom: 0 }} />
                {breaks.map(([s, e]) => (
                  <div
                    key={`${s}-${e}`}
                    className="hatched absolute inset-x-0 flex items-center justify-center bg-muted/40 text-[0.65rem] font-semibold text-muted-foreground"
                    style={{ top: y(s), height: (e - s) * PX_PER_MIN }}
                  >
                    Pausa
                  </div>
                ))}

                {/* Área clicável para novo agendamento */}
                {open && can("appointments.create") && (
                  <button
                    type="button"
                    aria-label={`Novo agendamento com ${c.name}`}
                    className="absolute inset-x-0 cursor-copy"
                    style={{ top: y(workStart), height: (workEnd - workStart) * PX_PER_MIN }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const minute = workStart + Math.floor((e.clientY - rect.top) / PX_PER_MIN / SNAP) * SNAP;
                      newAppointment({ date: data.date, time: minutesToTime(minute), professionalId: c.id });
                    }}
                  />
                )}

                {blocks.map((b) => {
                  const s = toDateKey(new Date(b.startsAt)) < data.date ? gridStart : minutesOfDay(new Date(b.startsAt));
                  const e = toDateKey(new Date(b.endsAt)) > data.date ? gridEnd : minutesOfDay(new Date(b.endsAt));
                  return (
                    <div
                      key={b.id}
                      className="absolute inset-x-1.5 flex items-start gap-1.5 overflow-hidden rounded-lg border border-stone-300 bg-stone-100/95 p-2 text-xs text-stone-600"
                      style={{
                        top: y(Math.max(s, gridStart)),
                        height: Math.max(20, (Math.min(e, gridEnd) - Math.max(s, gridStart)) * PX_PER_MIN),
                      }}
                      title={b.reason}
                    >
                      <Ban className="mt-0.5 size-3 shrink-0" aria-hidden />
                      <span className="font-semibold">{b.reason}</span>
                    </div>
                  );
                })}

                {items.map((a) => {
                  const s = minutesOfDay(new Date(a.startsAt));
                  const h = Math.max(26, a.durationMinutes * PX_PER_MIN - 3);
                  const muted = a.status === "CANCELLED" || a.status === "NO_SHOW";
                  if (
                    muted &&
                    items.some(
                      (o) =>
                        o.id !== a.id &&
                        o.status !== "CANCELLED" &&
                        o.status !== "NO_SHOW" &&
                        minutesOfDay(new Date(o.startsAt)) < s + a.durationMinutes &&
                        minutesOfDay(new Date(o.endsAt)) > s,
                    )
                  ) {
                    return null; // cancelado sobreposto por novo agendamento: some da grade
                  }
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => view(a)}
                      className={cn(
                        "group absolute inset-x-1.5 overflow-hidden rounded-xl border-l-[3px] px-2.5 py-1.5 text-left shadow-soft transition hover:z-10 hover:shadow-lifted focus-visible:z-10",
                        muted ? "bg-stone-50 opacity-60" : "bg-card",
                        a.status === "IN_SERVICE" && "ring-2 ring-terracotta-200",
                      )}
                      style={{
                        top: y(s) + 1.5,
                        height: h,
                        borderLeftColor: a.professionalColor,
                        backgroundImage: muted ? undefined : `linear-gradient(135deg, ${a.professionalColor}14, transparent 70%)`,
                      }}
                      aria-label={`${formatTime(a.startsAt)} ${a.clientName}, ${a.serviceName}, ${APPOINTMENT_STATUS_LABELS[a.status]}`}
                    >
                      <p className={cn("truncate text-[0.8rem] font-bold", muted && "line-through")}>
                        <span className="tabular mr-1 text-muted-foreground">{formatTime(a.startsAt)}</span>
                        {firstName(a.clientName)}{" "}
                        {a.clientName.split(" ").slice(-1)[0] !== firstName(a.clientName)
                          ? a.clientName.split(" ").slice(-1)[0][0] + "."
                          : ""}
                      </p>
                      {h > 40 && <p className="truncate text-xs text-muted-foreground">{a.serviceName}</p>}
                      {h > 62 && (
                        <p className="mt-1 text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">
                          {APPOINTMENT_STATUS_LABELS[a.status]}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {nowMinute !== null && nowMinute >= gridStart && nowMinute <= gridEnd && (
            <div
              className="pointer-events-none absolute right-0 left-[64px] z-20 flex items-center"
              style={{ top: y(nowMinute) }}
              aria-hidden
            >
              <span className="size-2.5 rounded-full bg-terracotta-500 ring-4 ring-terracotta-100" />
              <span className="h-[2px] flex-1 bg-terracotta-500/80" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
