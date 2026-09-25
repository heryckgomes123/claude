"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import type { AppointmentItem } from "@/components/appointments/appointment-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/utils/cn";

/** Agenda de hoje: próximos primeiro, com filtro rápido. */
export function TodayAgenda({ items, showProfessional = true }: { items: AppointmentItem[]; showProfessional?: boolean }) {
  const [filter, setFilter] = useState<"next" | "all">("next");
  const upcoming = items.filter((a) => ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_SERVICE"].includes(a.status));
  const list = filter === "next" ? upcoming : items;

  return (
    <div>
      <div className="mb-3 inline-flex rounded-xl bg-muted p-1 text-sm font-semibold" role="radiogroup" aria-label="Filtro da agenda">
        {(
          [
            ["next", `Próximos (${upcoming.length})`],
            ["all", `Todos (${items.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={filter === key}
            onClick={() => setFilter(key)}
            className={cn("rounded-lg px-3 py-1", filter === key ? "bg-card shadow-soft" : "text-muted-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarDays}
          title={filter === "next" ? "Sem próximos atendimentos hoje" : "Nenhum agendamento hoje"}
          description="Os agendamentos do dia aparecem aqui em ordem de horário."
        />
      ) : (
        <div className="-mx-2 divide-y divide-border/50">
          {list.map((a) => (
            <AppointmentCard key={a.id} appointment={a} showProfessional={showProfessional} />
          ))}
        </div>
      )}
    </div>
  );
}
