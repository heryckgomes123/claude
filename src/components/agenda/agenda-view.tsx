"use client";

import { Ban, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { useAppointmentActions } from "@/components/appointments/appointment-actions";
import { NewAppointmentButton } from "@/components/dashboard/new-appointment-button";
import { useCan } from "@/components/layout/app-context";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { addDays, formatDateKey, todayKey, toDateKey } from "@/utils/dates";
import { BlockDialog } from "./block-dialog";
import { DayGrid } from "./day-grid";
import type { AgendaPayload } from "./types";
import { WeekGrid } from "./week-grid";

export function AgendaView({ data, focusAppointmentId }: { data: AgendaPayload; focusAppointmentId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const can = useCan();
  const { view: openDetails } = useAppointmentActions();
  const [pending, startTransition] = useTransition();
  const [blocking, setBlocking] = useState(false);
  const focused = useRef<string | null>(null);

  const buildHref = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams({ date: data.date, view: data.view });
      if (data.professionalId) params.set("professional", data.professionalId);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      return `${pathname}?${params.toString()}`;
    },
    [data.date, data.view, data.professionalId, pathname],
  );

  const navigate = (patch: Record<string, string | null>) => startTransition(() => router.push(buildHref(patch), { scroll: false }));
  const step = data.view === "week" ? 7 : 1;

  // Abre o detalhe quando a URL traz ?appointment= (busca global / alertas).
  useEffect(() => {
    if (!focusAppointmentId || focused.current === focusAppointmentId) return;
    const found = data.appointments.find((a) => a.id === focusAppointmentId);
    if (found) {
      focused.current = focusAppointmentId;
      openDetails(found);
    }
  }, [focusAppointmentId, data.appointments, openDetails]);

  const title =
    data.view === "week" ? `${formatDateKey(data.from, "short")} – ${formatDateKey(data.to, "short")}` : formatDateKey(data.date, "long");
  const dayItems = data.appointments.filter((a) => toDateKey(new Date(a.startsAt)) === data.date);
  const activeCount = data.appointments.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW").length;

  return (
    <div className="space-y-4">
      {/* Barra de controle */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Período anterior" onClick={() => navigate({ date: addDays(data.date, -step) })}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" onClick={() => navigate({ date: todayKey() })} disabled={data.date === todayKey()}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" aria-label="Próximo período" onClick={() => navigate({ date: addDays(data.date, step) })}>
            <ChevronRight />
          </Button>
          <div className="ml-1 min-w-0">
            <p className="truncate text-base font-bold first-letter:uppercase sm:text-lg">{title}</p>
            <p className="text-xs text-muted-foreground">
              {activeCount} agendamento(s){pending && <Loader2 className="ml-1.5 inline size-3 animate-spin" aria-label="Carregando" />}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <Input
            type="date"
            aria-label="Ir para data"
            value={data.date}
            onChange={(e) => e.target.value && navigate({ date: e.target.value })}
            className="w-[calc(50%-0.25rem)] sm:w-auto"
          />
          {data.allProfessionals.length > 1 && (
            <NativeSelect
              aria-label="Filtrar por profissional"
              value={data.professionalId ?? ""}
              onChange={(e) => navigate({ professional: e.target.value || null })}
              className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-44"
            >
              <option value="">Todas as profissionais</option>
              {data.allProfessionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          )}
          <div className="inline-flex rounded-xl bg-muted p-1" role="radiogroup" aria-label="Visualização">
            {(
              [
                ["day", "Dia", CalendarDays],
                ["week", "Semana", CalendarRange],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={data.view === key}
                onClick={() => navigate({ view: key })}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                  data.view === key ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
          {can("schedule_blocks.manage") && (
            <Button variant="outline" onClick={() => setBlocking(true)}>
              <Ban /> <span className="hidden sm:inline">Bloquear</span>
            </Button>
          )}
          <NewAppointmentButton
            prefill={{ date: data.date >= todayKey() ? data.date : undefined, professionalId: data.professionalId ?? undefined }}
            label="Agendar"
          />
        </div>
      </div>

      <div className={cn("transition-opacity", pending && "opacity-60")}>
        {data.view === "week" ? (
          <WeekGrid data={data} buildHref={buildHref} />
        ) : data.columns.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhuma profissional ativa" description="Cadastre profissionais para montar a agenda." />
        ) : (
          <>
            <div className="hidden md:block">
              <DayGrid data={data} />
            </div>
            <div className="md:hidden">
              {dayItems.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Agenda livre"
                  description="Nenhum agendamento neste dia."
                  action={<NewAppointmentButton prefill={{ date: data.date }} />}
                />
              ) : (
                <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card px-1 shadow-soft">
                  {dayItems.map((a) => (
                    <AppointmentCard key={a.id} appointment={a} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {data.blocks.length > 0 && data.view === "day" && (
        <p className="text-xs text-muted-foreground">
          <Ban className="mr-1 inline size-3" aria-hidden />
          Bloqueios: {data.blocks.map((b) => `${b.professionalName ?? "Salão"} — ${b.reason}`).join(" · ")}
        </p>
      )}

      {can("schedule_blocks.manage") && (
        <BlockDialog
          open={blocking}
          onOpenChange={setBlocking}
          date={data.date}
          professionals={data.allProfessionals}
          blocks={data.blocks}
        />
      )}
    </div>
  );
}
